#!/usr/bin/env python3
"""
Migrate feed documents to sessions collection.

This script converts legacy feed documents (quiz results, training results)
to sessions collection documents. This is useful for:
1. Backfilling sessions from historical feed data
2. Recovering lost sessions from feed entries

Usage:
  python scripts/migrate_feed_to_sessions.py [--dry-run] [--user email@example.com]

Options:
  --dry-run    Show what would be migrated without making changes
  --user       Migrate only documents for specific user email
"""

import sys
import os
from datetime import datetime, timedelta
from pymongo import MongoClient

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from letmelearn.data import DB_CONN, DB_NAME


def parse_feed_when(when_value):
  """Parse 'when' field from feed document to datetime.

  Args:
    when_value: Either ISO string or datetime object

  Returns:
    datetime object
  """
  if isinstance(when_value, datetime):
    return when_value
  if isinstance(when_value, str):
    # Handle ISO format with or without 'Z'
    if when_value.endswith('Z'):
      when_value = when_value[:-1]
    return datetime.fromisoformat(when_value)
  raise ValueError(f"Cannot parse 'when' value: {when_value}")


def feed_to_session(feed_doc):
  """Convert a feed document to a session document.

  Args:
    feed_doc: Document from feed collection

  Returns:
    Document suitable for sessions collection
  """
  # Parse kind: 'quiz result' -> 'quiz', 'training result' -> 'training'
  kind = feed_doc.get('kind', 'quiz result')
  if kind.endswith(' result'):
    kind = kind[:-7]  # Remove ' result'

  # Get user from array (feed stores as array of user objects)
  user_value = feed_doc.get('user', [])
  if isinstance(user_value, list) and len(user_value) > 0:
    if isinstance(user_value[0], dict):
      user = user_value[0].get('email', user_value[0].get('_id', 'unknown'))
    else:
      user = user_value[0]
  else:
    user = 'unknown'

  # Parse stopped_at from 'when'
  stopped_at = parse_feed_when(feed_doc['when'])

  # Calculate started_at from elapsed (elapsed is in seconds)
  elapsed = feed_doc.get('elapsed', 0)
  started_at = stopped_at - timedelta(seconds=elapsed)

  return {
    'user': user,
    'kind': kind,
    'topics': feed_doc.get('topics', []),
    'status': 'completed',
    'started_at': started_at,
    'stopped_at': stopped_at,
    'elapsed': elapsed,
    'questions': feed_doc.get('questions'),
    'asked': feed_doc.get('asked'),
    'attempts': feed_doc.get('attempts'),
    'correct': feed_doc.get('correct')
  }


def migrate_feed_to_sessions(db, dry_run=False, user_filter=None, cleanup=False):
  """Migrate feed documents to sessions collection.

  Args:
    db: MongoDB database connection
    dry_run: If True, show what would be migrated without making changes
    user_filter: If provided, only migrate documents for this user
    cleanup: If True, delete migrated feed items after successful migration

  Returns:
    Tuple of (migrated_count, skipped_count, duplicate_count)
  """
  feed_collection = db['feed']
  sessions_collection = db['sessions']

  # Query for feed documents that are quiz/training results
  query = {
    'kind': {'$in': ['quiz result', 'training result']}
  }

  if user_filter:
    query['user.0'] = user_filter
    print(f"Filtering by user: {user_filter}")

  feed_docs = list(feed_collection.find(query))
  print(f"Found {len(feed_docs)} feed documents to process")

  migrated = 0
  skipped = 0
  duplicates = 0
  migrated_ids = []

  for feed_doc in feed_docs:
    try:
      session_doc = feed_to_session(feed_doc)

      # Check if a session already exists for this user/time/kind combination
      # Use time window matching (within 1 second) to handle minor timestamp differences
      existing = sessions_collection.find_one({
        'user': session_doc['user'],
        'kind': session_doc['kind'],
        'started_at': {
          '$gte': session_doc['started_at'] - timedelta(seconds=1),
          '$lte': session_doc['started_at'] + timedelta(seconds=1)
        }
      })

      if existing:
        print(f"  Skipping (existing session): user={session_doc['user']}, "
              f"kind={session_doc['kind']}, started_at={session_doc['started_at']}")
        duplicates += 1
        continue

      if dry_run:
        print(f"  Would migrate: user={session_doc['user']}, kind={session_doc['kind']}, "
              f"started_at={session_doc['started_at']}, elapsed={session_doc['elapsed']}s")
        migrated += 1
        migrated_ids.append(feed_doc['_id'])
      else:
        result = sessions_collection.insert_one(session_doc)
        print(f"  Migrated: {result.inserted_id} - user={session_doc['user']}, "
              f"kind={session_doc['kind']}, started_at={session_doc['started_at']}")
        migrated += 1
        migrated_ids.append(feed_doc['_id'])

    except Exception as e:
      print(f"  Error processing {feed_doc.get('_id')}: {e}")
      skipped += 1

  # Cleanup: Delete migrated feed items
  if cleanup and migrated_ids and not dry_run:
    delete_result = feed_collection.delete_many({'_id': {'$in': migrated_ids}})
    print(f"\n  Cleaned up {delete_result.deleted_count} migrated feed items")
  elif cleanup and dry_run and migrated_ids:
    print(f"\n  Would delete {len(migrated_ids)} migrated feed items")

  return migrated, skipped, duplicates


def main():
  import argparse

  parser = argparse.ArgumentParser(description='Migrate feed documents to sessions')
  parser.add_argument('--dry-run', action='store_true',
                      help='Show what would be migrated without making changes')
  parser.add_argument('--user', type=str,
                      help='Migrate only documents for specific user email')
  parser.add_argument('--cleanup', action='store_true',
                      help='Delete migrated feed items after successful migration')
  args = parser.parse_args()

  print("Connecting to database...")
  client = MongoClient(DB_CONN, serverSelectionTimeoutMS=5000)
  db = client[DB_NAME]

  print(f"Database: {DB_NAME}")
  print(f"Dry run: {args.dry_run}")
  print(f"Cleanup: {args.cleanup}")
  print()

  migrated, skipped, duplicates = migrate_feed_to_sessions(
    db,
    dry_run=args.dry_run,
    user_filter=args.user,
    cleanup=args.cleanup
  )

  print()
  print(f"Summary: {migrated} migrated, {duplicates} duplicates (skipped), {skipped} errors")

  if args.dry_run:
    print()
    print("This was a dry run. No changes were made.")
    print("Run without --dry-run to apply changes.")


if __name__ == '__main__':
  main()