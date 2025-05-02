from dataclasses import dataclass, field
from typing import List

@dataclass
class TreeItem:
  """
  common baseclass for all TreeItems
  """
  name   : str
  id     : str = None  # none == implementing class needs to generate it
  _id    : str = field(init=False, repr=False, default=None)
  parent : "TreeItem" = field(init=False, repr=False, default=None) # none=root
  
  def as_dict(self):
    return { "id" : self.id, "name" : self.name }

  def __getitem__(self, id):
    if self.id == id:
      return self
    raise KeyError

  @property
  def path(self):
    if self.parent:
      return self.parent.path + [ self ]
    return [ self ]

  @property
  def root(self):
    if self.parent is None:
      return self
    return self.parent.root

@dataclass
class Topic(TreeItem):
  """
  simple class representing a Topic TreeITem
  """
  @property
  def id(self):
    if self._id:
      return self._id
    return self.name

  @id.setter
  def id(self, value):
    self._id = value

@dataclass
class Folder(TreeItem):
  """
  simple class representing a Folder TreeItem
  """
  children : List[TreeItem] = field(default_factory=list, init=False, repr=False)

  @property
  def id(self):
    if self._id:
      return self._id
    if self.parent:
      return self.parent.id + "/" + self.name
    return self.name

  @id.setter
  def id(self, value):
    self._id = value

  def add(self, child):
    child.parent = self
    self.children.append(child)
    return child

  def as_dict(self):
    d = super().as_dict()
    d["children"] = [ child.as_dict() for child in self.children ]
    return d

  def __getitem__(self, id):
    if self.id == id:
      return self
    for child in self.children:
      try:
        return child[id]
      except KeyError:
        pass
    raise KeyError

@dataclass
class TreeItems:
  """
  helper class to access the nested tree structure of folders and topics
  root = {
    "children" : [ <TreeItem>,... ]
  }
  """
  children : List[TreeItem] = field(default_factory=list)

  def as_dicts(self):
    return [ child.as_dict() for child in self.children ]

  @classmethod
  def from_dicts(cls, dicts):
    items = cls()
    items.children = []
    for d in dicts:
      children = d.pop("children", None)
      if isinstance(children, list):
        folder = Folder(**d)
        for child in TreeItems.from_dicts(children).children:
          folder.add(child)
        items.children.append(folder)
        d["children"] = children # don't modify source
      else:
        items.children.append(Topic(**d))
    return items

  def __getitem__(self, id=None):
    if id is None:
      return self
    for child in self.children:
      try:
        return child[id]
      except KeyError:
        pass
    raise KeyError

  def add(self, child):
    self.children.append(child)

  def remove(self, id):
    obj = self[id]
    if obj.parent:
      obj.parent.children.remove(obj)
    else:
      self.children.remove(obj)
    return obj

  def move(self, id, new_parent_id):
    self[new_parent_id].add(self.remove(id))
