"""Setup for letmelearn package."""

from setuptools import setup, find_packages

setup(
    name="letmelearn",
    version="0.0.6",
    packages=find_packages(),
    install_requires=[
        "baseweb",
        "pymongo",
        "Flask-Login",
        "oatk",
        "gunicorn",
        "eventlet",
    ],
)