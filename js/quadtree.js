"use strict";
function build_quadtree(x, y, width, height, leaf_size) {
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
  let half_width = 0,
    half_height = 0;

  if (width > leaf_size && height > leaf_size) {
    half_width = width/2,
    half_height = height/2;

    tree.bottom_right = build_quadtree(
      x+half_width, y+half_height, half_width, half_height, leaf_size);
    tree.top_right = build_quadtree(
      x+half_width, y, half_width, half_height, leaf_size);
    tree.bottom_left = build_quadtree(
      x, y+half_height, half_width, half_height, leaf_size);
    tree.top_left = build_quadtree(
      x, y, half_width, half_height, leaf_size);

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
    prepend = "",
    i = null,
    ei = null;

  depth = depth || 1;

  if (tree !== null) {
    for (i = 0; i < depth; i++) {
      prepend += "  ";
    }

    console.log("depth " + depth + ":" + prepend + "x, y: (" + tree.x + ", " + tree.y + ") to (" + parseInt(tree.x+tree.width) + ", " + parseInt(tree.y+tree.height) + ") dim: [" + tree.width + " x " + tree.height + "]");

    for (ei in tree.entities) {
        entity = tree.entities[ei];
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

function quadtree_insert (tree, entity) {
  // insert at correct leaf, use entity's x+y
  let x = entity.x,
    y = entity.y,
    corner = null;

  if (tree.entities !== null) {
    return tree.entities.push(entity);
  }

  corner = quadtree_get_corner(tree, x, y);
  if (corner === null) {
    debugger;
  }
  return quadtree_insert(corner, entity);
}

function quadtree_get_by_id (tree, entity_id) {
  // return entity from leaf by its id
  // this is a slow bear
  let i = null;

  if (tree.entities !== null) {
    for (i in tree.entities) {
      if (tree.entities[i].id === entity_id) {
        return tree.entities[i];
      }
    }

    // leaf-case: if no entity was found, return null
    return null;
  }

  let entity = quadtree_get_by_id(tree.top_right, entity_id);
  if (entity) {
    return entity;
  }
  entity = quadtree_get_by_id(tree.top_left, entity_id);
  if (entity) {
    return entity;
  }
  entity = quadtree_get_by_id(tree.bottom_right, entity_id);
  if (entity) {
    return entity;
  }
  entity = quadtree_get_by_id(tree.bottom_left, entity_id);
  if (entity) {
    return entity;
  }

  // non-leaf not-found case
  return null;
}

function quadtree_get_by_coords (tree, x, y) {
  // return entities from leaf by their coords
  let epsilon = 0.01,
    corner = null,
    high_x = 0,
    low_x = 0,
    high_y = 0,
    low_y = 0,
    entity_list = [],
    e = null,
    i = null,
    corner = null;

  if (tree.entities !== null) {
    high_x = x + epsilon;
    low_x = x - epsilon;
    high_y = y + epsilon;
    low_y = y - epsilon;
    entity_list = [];

    for (i in tree.entities) {
      e = tree.entities[i];
      if (high_x > e.x && low_x < e.x && high_y > e.y && low_y < e.y) {
        entity_list.push(e);
      }
    }
    return entity_list;
  }

  corner = quadtree_get_corner(tree, x, y);
  return quadtree_get_by_coords(corner, x, y);
}

function quadtree_remove_by_id (tree, entity_id) {
  let i = null;

  // remove entity by its id
  // return entity from leaf by its id
  if (tree.entities !== null) {
    for (i in tree.entities) {
      if (tree.entities[i].id === entity_id) {
        return tree.entities.splice(i, 1)[0];
      }
    }

    // leaf case: entity not found
    return null;
  }

  let entity = quadtree_remove_by_id(tree.top_right, entity_id);
  if (entity) {
    return entity;
  }
  entity = quadtree_remove_by_id(tree.top_left, entity_id);
  if (entity) {
    return entity;
  }
  entity = quadtree_remove_by_id(tree.bottom_right, entity_id);
  if (entity) {
    return entity;
  }
  entity = quadtree_remove_by_id(tree.bottom_left, entity_id);
  if (entity) {
    return entity;
  }

  // non-leaf-case: entity not found
  return null;
}

function quadtree_get_by_range (tree, x, y, x2, y2) {
  // return entities from leaf by coord
  // return entities from leaf by their coords
  let epsilon = 0.01,
    entity_list = [],
    high_x = 0,
    low_x = 0,
    high_y = 0,
    low_y = 0,
    corners = null,
    e = null,
    i = null;

  if (tree.entities !== null) {
    high_x = Math.max(x, x2) + epsilon,
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

  corners = quadtree_range_check_corners(tree, x, y, x2, y2);
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

function quadtree_remove_by_range (tree, x, y, x2, y2) {
  // remove entities by coord range

  let epsilon = 0.01,
    high_x = 0,
    low_x = 0,
    high_y = 0,
    low_y = 0,
    entity_list = [],
    e = null,
    i = null,
    ri = null,
    corners = null;

  if (tree.entities !== null) {
    high_x = Math.max(x, x2) + epsilon;
    low_x = Math.min(x, x2) - epsilon;
    high_y = Math.max(y, y2) + epsilon;
    low_y = Math.min(y, y2) - epsilon;
    to_splice = [];

    for (i in tree.entities) {
      e = tree.entities[i];
      if (high_x > e.x && low_x < e.x && high_y > e.y && low_y < e.y) {
        to_splice.push(i);
      }
    }

    // must walk backward over the list after finding, because
    // indices would shift if you walk forward or delete-as-you-go
    // also, record ids as we splice
    for (ri = to_splice.length-1; ri >= 0; ri--) {
      entity_list.push(tree.entities.splice(to_splice[ri], 1)[0]);
    }

    return entity_list;
  }

  corners = quadtree_range_check_corners(tree, x, y, x2, y2);
  if (corners.bottom_right) {
    entity_list = entity_list.concat(quadtree_remove_by_range(tree.bottom_right, x, y, x2, y2));
  }
  if (corners.top_right) {
    entity_list = entity_list.concat(quadtree_remove_by_range(tree.top_right, x, y, x2, y2));
  }
  if (corners.bottom_left) {
    entity_list = entity_list.concat(quadtree_remove_by_range(tree.bottom_left, x, y, x2, y2));
  }
  if (corners.top_left) {
    entity_list = entity_list.concat(quadtree_remove_by_range(tree.top_left, x, y, x2, y2));
  }

  return entity_list;
}
