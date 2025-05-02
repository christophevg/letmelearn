import json

from letmelearn.treeitems import Topic, Folder, TreeItems

def test_topic_with_provided_id():
  topic = Topic("some topic", id="test topic")
  assert topic.as_dict() == {
    "id"   : "test topic",
    "name" : "some topic"
  }

def test_topic_with_default_id():
  topic = Topic("some topic")
  assert topic.as_dict() == {
    "id"   : "some topic",
    "name" : "some topic"
  }

def test_folder_with_provided_id():
  folder = Folder("some folder", id="test folder")
  assert folder.as_dict() == {
    "id"       : "test folder",
    "name"     : "some folder",
    "children" : []
  }

def test_root_folder_with_default_id():
  folder = Folder("root")
  assert folder.as_dict() == {
    "id"       : "root",
    "name"     : "root",
    "children" : []
  }

def test_building_extended_tree_structure():
  root = Folder("root")
  folder1 = root.add(Folder("folder 1"))
  folder2 = root.add(Folder("folder 2"))
  folder3 = root.add(Folder("folder 3"))
  folder1.add(Topic("topic 1"))
  folder2.add(Topic("topic 2"))
  folder3.add(Topic("topic 3"))

  assert root.as_dict() == {
    "id" : "root",
    "name" : "root",
    "children" : [
      {
        "id" : "root/folder 1",
        "name" : "folder 1",
        "children" : [
          {
            "id" : "topic 1",
            "name" : "topic 1"
          }
        ]
      },
      {
        "id" : "root/folder 2",
        "name" : "folder 2",
        "children" : [
          {
            "id" : "topic 2",
            "name" : "topic 2"
          }
        ]
      },
      {
        "id" : "root/folder 3",
        "name" : "folder 3",
        "children" : [
          {
            "id" : "topic 3",
            "name" : "topic 3"
          }
        ]
      }
    ]
  }

def test_finding_item_by_id_in_extended_tree_structure():
  root = Folder("root")
  folder1 = root.add(Folder("folder 1"))
  folder2 = root.add(Folder("folder 2"))
  folder3 = root.add(Folder("folder 3"))
  topic1  = folder1.add(Topic("topic 1"))
  folder2.add(Topic("topic 2"))
  folder3.add(Topic("topic 3"))

  assert root["topic 1"] is topic1
  assert root["root/folder 3"] is folder3
  try:
    root["blah"]
    assert False
  except KeyError:
    pass

def test_root_property_on_item():
  root = Folder("root")
  folder1 = root.add(Folder("folder 1"))
  folder2 = root.add(Folder("folder 2"))
  folder3 = root.add(Folder("folder 3"))
  topic1  = folder1.add(Topic("topic 1"))
  folder2.add(Topic("topic 2"))
  folder3.add(Topic("topic 3"))

  assert topic1.root is root

def test_path_property_on_item():
  root = Folder("root")
  folder1 = root.add(Folder("folder 1"))
  folder2 = root.add(Folder("folder 2"))
  folder3 = root.add(Folder("folder 3"))
  topic1  = folder1.add(Topic("topic 1"))
  folder2.add(Topic("topic 2"))
  folder3.add(Topic("topic 3"))

  assert topic1.path == [ root, folder1, topic1 ]

dicts = [
  {
    "id" : "root",
    "name" : "root",
    "children" : [
      {
        "id" : "root/folder 1",
        "name" : "folder 1",
        "children" : [
          {
            "id" : "topic 1",
            "name" : "topic 1"
          }
        ]
      },
      {
        "id" : "root/folder 2",
        "name" : "folder 2",
        "children" : [
          {
            "id" : "topic 2",
            "name" : "topic 2"
          }
        ]
      },
      {
        "id" : "root/folder 3",
        "name" : "folder 3",
        "children" : [
          {
            "id" : "topic 3",
            "name" : "topic 3"
          }
        ]
      }
    ]
  },
  {
    "id"   : "folder x",
    "name" : "folder x"
  }
]

def test_loading_extended_tree_structure_from_dicts():
  roundtrip = TreeItems.from_dicts(dicts).as_dicts()
  
  expected = json.dumps(dicts,     indent=2, sort_keys=True)
  out      = json.dumps(roundtrip, indent=2, sort_keys=True)

  assert expected == out

def test_accessing_items_from_treeitems():
  items = TreeItems.from_dicts(dicts)
  assert isinstance(items["topic 3"], Topic)
  assert items["topic 3"].id   == "topic 3"
  assert items["topic 3"].name == "topic 3"

  assert isinstance(items["folder x"], Topic)
  assert items["folder x"].id   == "folder x"
  assert items["folder x"].name == "folder x"

def test_removing_item_by_id_from_treeitems():
  items = TreeItems.from_dicts(dicts)
  items.remove("folder x")
  items.remove("root/folder 2")
  items.remove("topic 3")
  
  try:
    items.remove("blah")
    assert False
  except KeyError:
    pass
  
  expected = json.dumps(
    [
      {
        "id" : "root",
        "name" : "root",
        "children" : [
          {
            "id" : "root/folder 1",
            "name" : "folder 1",
            "children" : [
              {
                "id" : "topic 1",
                "name" : "topic 1"
              }
            ]
          },
          {
            "id" : "root/folder 3",
            "name" : "folder 3",
            "children" : []
          }
        ]
      }
    ], indent=2, sort_keys=True  
  )

  assert json.dumps(items.as_dicts(), indent=2, sort_keys=True) == expected
