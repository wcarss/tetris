function build_quadtree(x, y, width, height, leaf_size, entity_index) {
  // - this definition is the structure of each tree node
  // - they all have an x,y position and a width/height, which is their bounds
  // - the entity-list is non-null on leaves and null everywhere else
  // - the top/bottom left/right keys are pointers to the next layer
  // - they are null on leaves and non-null elsewhere
  // - the height is not explicitly stored
  // - the tree is built such that all branches should have the same depth,
  //   even if there are no objects in that branch. This could be optimized,
  //   perhaps by storing the count of objects beneath each branch, which would
  //   allow for early branch-cutting.
  // - the bound I've chosen to stop splitting is the "size of leaves", which
  //   could be totally the wrong choice.
  let tree = {
    height: height,
    width: width,
    x: x,
    y: y,
    entities: [],
    top_right: null,
    top_left: null,
    bottom_right: null,
    bottom_left: null,
  };

  if (!entity_index) {
    entity_index = {};
  }
  tree.entity_index = entity_index;

  if (width > leaf_size && height > leaf_size) {
    let half_width = width/2,
      half_height = height/2;

    tree.bottom_right = build_quadtree(
      x+half_width,
      y+half_height,
      half_width,
      half_height,
      leaf_size,
      tree.entity_index
    );

    tree.top_right = build_quadtree(
      x+half_width,
      y,
      half_width,
      half_height,
      leaf_size,
      tree.entity_index
    );

    tree.bottom_left = build_quadtree(
      x,
      y+half_height,
      half_width,
      half_height,
      leaf_size,
      tree.entity_index
    );

    tree.top_left = build_quadtree(
      x,
      y,
      half_width,
      half_height,
      leaf_size,
      tree.entity_index
    );

    tree.entities = null;
  }

  return tree;
}

function quadtree_print_tree (tree, depth) {
  // prints like this (no parentage necessary)
  // 1 (root)
  //  2 (br)
  //   3 (br)
  //   3 (tr)
  //   3 (bl)
  //   3 (tl)
  //  2 (tr)
  //   3 (br)
  //   3 (tr)
  //   3 (bl)
  //   3 (tl)
  //  2 (bl)
  //   3 (br)
  //   3 (tr)
  //   3 (bl)
  //   3 (tl)
  //  2 (tl)
  //   3 (br)
  //   3 (tr)
  //   3 (bl)
  //   3 (tl)
  if (tree !== null) {
    depth = depth || 1;
    quadtree_print_node(tree, depth);
    quadtree_print_tree(tree.bottom_right, depth+1);
    quadtree_print_tree(tree.top_right, depth+1);
    quadtree_print_tree(tree.bottom_left, depth+1);
    quadtree_print_tree(tree.top_left, depth+1);
  }
}

function quadtree_print_tree_alt (tree, depth) {
  // not quite as useful, prints like this (the from is necessary here)
  // 1 (root)
  //  2 (br)
  //  2 (tr)
  //  2 (bl)
  //  2 (tl)
  //   3 (br) (from 2 br)
  //   3 (tr) (from 2 br)
  //   3 (bl) (from 2 br)
  //   3 (tl) (from 2 br)
  //   3 (br) (from 2 tr)
  //   3 (tr) (from 2 tr)
  //   3 (bl) (from 2 tr)
  //   3 (tl) (from 2 tr)
  //   3 (br) (from 2 bl)
  //   3 (tr) (from 2 bl)
  //   3 (bl) (from 2 bl)
  //   3 (tl) (from 2 bl)
  //   3 (br) (from 2 tl)
  //   3 (tr) (from 2 tl)
  //   3 (bl) (from 2 tl)
  //   3 (tl) (from 2 tl)
  if (tree !== null) {
    depth = depth || 1;
    if (depth === 1) {
      quadtree_print_node(tree, depth);
    }
    quadtree_print_node(tree.bottom_right, depth+1);
    quadtree_print_node(tree.top_right, depth+1);
    quadtree_print_node(tree.bottom_left, depth+1);
    quadtree_print_node(tree.top_left, depth+1);
    quadtree_print_tree_alt(tree.bottom_right, depth+1);
    quadtree_print_tree_alt(tree.top_right, depth+1);
    quadtree_print_tree_alt(tree.bottom_left, depth+1);
    quadtree_print_tree_alt(tree.top_left, depth+1);
  }
}

function quadtree_print_node (tree, depth) {
  // printing the node-path would be an interesting extension
  let entity = null,
    prepend = "";

  depth = depth || 1;

  if (tree !== null) {
    for (i = 0; i < depth; i++) {
      prepend += "  ";
    }

    console.log("depth " + depth + ":" + prepend + "x, y: (" + tree.x + ", " + tree.y + ") to (" + parseInt(tree.x+tree.width) + ", " + parseInt(tree.y+tree.height) + ") dim: [" + tree.width + " x " + tree.height + "]");

    for (i in tree.entities) {
        entity = tree.entities[i];
        console.log("depth " + depth + ":  " + prepend + entity.id + ": (" + entity.x + ", " + entity.y + ")");
    }
  }
}

function quadtree_check_corners (tree, x, y) {
  // find applicable corner collisions

  let corners = {
    bottom_right: false,
    top_right: false,
    bottom_left: false,
    top_left: false
  };

  if (x >= tree.x + tree.width / 2 && y >= tree.y + tree.height / 2) {
    corners.bottom_right = true;
  } else if (x >= tree.x + tree.width / 2 && y < tree.y + tree.height / 2) {
    corners.top_right = true;
  } else if (x < tree.x + tree.width / 2 && y >= tree.y + tree.height / 2) {
    corners.bottom_left = true;
  } else if (x < tree.x + tree.width / 2 && y < tree.y + tree.height / 2) {
    corners.top_left = true;
  }

  return corners;
}

function quadtree_get_corner (tree, x, y) {
  // return applicable corner
  // only one should apply -- so order should not matter

  let corners = quadtree_check_corners(tree, x, y);
  if (corners.bottom_right) {
    return tree.bottom_right;
  }
  if (corners.top_right) {
    return tree.top_right;
  }
  if (corners.bottom_left) {
    return tree.bottom_left;
  }
  if (corners.top_left) {
    return tree.top_left;
  }

  // not found
  return null;
}

function quadtree_range_check_corners (tree, x, y, x2, y2) {
  let low_x = Math.min(x, x2),
    high_x = Math.max(x, x2),
    low_y = Math.min(y, y2),
    high_y = Math.max(y, y2);

  x = low_x;
  x2 = high_x;
  y = low_y;
  y2 = high_y;

  let low_low_corners = quadtree_check_corners(tree, x, y),
    low_high_corners = quadtree_check_corners(tree, x, y2),
    high_low_corners = quadtree_check_corners(tree, x2, y),
    high_high_corners = quadtree_check_corners(tree, x2, y2),
    final_corners = {};

  if (low_low_corners.bottom_right || low_high_corners.bottom_right ||
    high_low_corners.bottom_right || high_high_corners.bottom_right) {
    final_corners.bottom_right = true;
  }
  if (low_low_corners.top_right || low_high_corners.top_right ||
    high_low_corners.top_right || high_high_corners.top_right) {
    final_corners.top_right = true;
  }
  if (low_low_corners.bottom_left || low_high_corners.bottom_left ||
    high_low_corners.bottom_left || high_high_corners.bottom_left) {
    final_corners.bottom_left = true;
  }
  if (low_low_corners.top_left || low_high_corners.top_left ||
    high_low_corners.top_left || high_high_corners.top_left) {
    final_corners.top_left = true;
  }

  return final_corners;
}

function quadtree_move (tree, entity, x, y) {
  entity.quadtree_moving = true;
  entity.x = x;
  entity.y = y;
  quadtree_remove_by_id(tree, entity.id, true);
  if (tree.entity_index[entity.id]) {
    quadtree_insert(tree, entity);
  }
  delete entity.quadtree_moving;
}

function quadtree_insert (tree, entity) {
  // insert at correct leaf, use entity's x+y
  let x = entity.x,
    y = entity.y;

  if (tree === null) {
    debugger;
  } else if (tree.entities !== null && entity.quadtree_removed !== true) {
    tree.entity_index[entity.id] = entity;
    delete entity.quadtree_list;
    entity.quadtree_list = tree.entities;
    return tree.entities.push(entity);
  }

  corner = quadtree_get_corner(tree, x, y);
  return quadtree_insert(corner, entity);
}

function quadtree_get_by_id (tree, entity_id) {
  return tree.entity_index[entity_id];
}

function quadtree_get_by_coords (tree, x, y) {
  // return entities from leaf by their coords
  let epsilon = 0.01;
  if (tree.entities !== null) {
    let high_x = x + epsilon,
      low_x = x - epsilon,
      high_y = y + epsilon,
      low_y = y - epsilon,
      entity_list = [];

    for (i in tree.entities) {
      let e = tree.entities[i];
      if (high_x > e.x && low_x < e.x && high_y > e.y && low_y < e.y) {
        entity_list.push(e);
      }
    }
    return entity_list;
  }

  let corner = quadtree_get_corner(tree, x, y);
  return quadtree_get_by_coords(corner, x, y);
}


function quadtree_remove_by_id (tree, entity_id, moving) {
  let entity = tree.entity_index[entity_id];
  let entity_index = null;
  let deleted_entity = null;

  if (!entity) {
    return null;
  }

  if (!moving) {
    delete tree.entity_index[entity_id];
    entity.quadtree_removed = true;
  }

  for (entity_index in entity.quadtree_list) {
    if (entity.quadtree_list[entity_index].id === entity.id) {
      deleted_entity = entity.quadtree_list.splice(entity_index, 1);
      delete entity.quadtree_list;
      return deleted_entity[0];
    }
  }
}

function quadtree_get_by_range (tree, x, y, x2, y2) {
  // return entities from leaf by coord
  // return entities from leaf by their coords
  let epsilon = 0.01,
    entity_list = [];

  if (tree.entities !== null) {
    let high_x = Math.max(x, x2) + epsilon,
      low_x = Math.min(x, x2) - epsilon,
      high_y = Math.max(y, y2) + epsilon,
      low_y = Math.min(y, y2) - epsilon;

    for (i in tree.entities) {
      e = tree.entities[i];
      if (high_x > e.x && low_x < e.x && high_y > e.y && low_y < e.y) {
        entity_list.push(e);
      }
    }

    return entity_list;
  }

  let corners = quadtree_range_check_corners(tree, x, y, x2, y2);
  if (corners.bottom_right) {
    entity_list = entity_list.concat(quadtree_get_by_range(tree.bottom_right, x, y, x2, y2));
  }
  if (corners.top_right) {
    entity_list = entity_list.concat(quadtree_get_by_range(tree.top_right, x, y, x2, y2));
  }
  if (corners.bottom_left) {
    entity_list = entity_list.concat(quadtree_get_by_range(tree.bottom_left, x, y, x2, y2));
  }
  if (corners.top_left) {
    entity_list = entity_list.concat(quadtree_get_by_range(tree.top_left, x, y, x2, y2));
  }

  return entity_list;
}

function quadtree_remove_by_range (tree, x, y, x2, y2, id) {
  // remove entities by coord range

  let epsilon = 0.01,
    entity_list = [],
    deleted_entity = null;

  if (tree.entities !== null) {
    let high_x = Math.max(x, x2) + epsilon,
      low_x = Math.min(x, x2) - epsilon,
      high_y = Math.max(y, y2) + epsilon,
      low_y = Math.min(y, y2) - epsilon,
      to_splice = [];

    for (i in tree.entities) {
      e = tree.entities[i];
      if (id && e.id !== id) {
        continue;
      }

      if (high_x > e.x && low_x < e.x && high_y > e.y && low_y < e.y) {
        to_splice.push(i);
      }
    }

    // must walk backward over the list after finding, because
    // indices would shift if you walk forward or delete-as-you-go
    // also, record ids as we splice
    for (i = to_splice.length-1; i >= 0; i--) {
      deleted_entity = tree.entities.splice(to_splice[i], 1)[0];
      deleted_entity.quadtree_removed = true;
      delete tree.entity_index[deleted_entity.id];
      entity_list.push(deleted_entity);
    }

    return entity_list;
  }

  let corners = quadtree_range_check_corners(tree, x, y, x2, y2);
  if (corners.bottom_right) {
    entity_list = entity_list.concat(quadtree_remove_by_range(tree.bottom_right, x, y, x2, y2, id));
  }
  if (corners.top_right) {
    entity_list = entity_list.concat(quadtree_remove_by_range(tree.top_right, x, y, x2, y2, id));
  }
  if (corners.bottom_left) {
    entity_list = entity_list.concat(quadtree_remove_by_range(tree.bottom_left, x, y, x2, y2, id));
  }
  if (corners.top_left) {
    entity_list = entity_list.concat(quadtree_remove_by_range(tree.top_left, x, y, x2, y2, id));
  }

  return entity_list;
}
