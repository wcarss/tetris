"use strict";
function rotate_shape(shape, direction) {
  let i = null,
    box = null,
    new_coordinates = null;

  for (i in shape.pieces) {
    box = shape.pieces[i];
    new_coordinates = rotate_coordinates(box.rel_x, box.rel_y, direction);
    //console.log("x, y: " + new_coordinates.x + ", " + new_coordinates.y);
    box.rel_x = new_coordinates.x;
    box.rel_y = new_coordinates.y;
  }
}

function get_random_piece_color() {
  let level_string = "level_6_tile_";
  let tile = array_random([1,3,5,6]);

  return level_string + tile;
}

/*  arrays of relative x,y coords of tetris pieces
 *
 *  e.g. triforce: {[
 *    {
 *      rel_x: -1,
 *      rel_y: 0,
 *    },
 *    {
 *      rel_x: 0,
 *      rel_y: 0,
 *    }
 *    ...
 *  ]}    
*/
let shapes = {
  triforce: [[-1, 0], [0, 0], [1,  0], [0,  1]],
  line:     [[-1, 0], [0, 0], [1,  0], [2,  0]],
  box:      [[ 0, 0], [0, 1], [1,  0], [1,  1]],
  zig:      [[-1, 0], [0, 0], [0, -1], [1, -1]],
  zag:      [[-1, 0], [0, 0], [0,  1], [1,  1]],
  left:     [[-1, 0], [0, 0], [1,  0], [1, -1]],
  right:    [[-1, 0], [0, 0], [1,  0], [1,  1]]
};

let shape_names = [
  'triforce',
  'line',
  'box',
  'zig',
  'zag',
  'right',
  'left'
];

function hydrate_shape(shape_name) {
  let i = null,
    tile = null,
    tile_index = null,
    spec = shapes[shape_name],
    shape = {
      x: 0, y: 0,
      name: shape_name,
      pieces: [],
      state: "falling",
      lowest_x: 0, highest_x: 0,
      lowest_y: 0, highest_y: 0,
    };

  for (tile_index in spec) {
    tile = spec[tile_index];
    shape.pieces.push({
      x: 0, y: 0,
      x_size: 32, y_size: 32,
      x_scale: 1, y_scale: 1,
      layer: 1,
      active: true,
      id: "piece-" + tile_index + timestamp_id().slice(-7),
      type: "piece",
      img: null, // gonna have to think about this
      rel_x: tile[0],
      rel_y: tile[1],
      shape: shape,
      state: "falling",
      update: function (delta, manager) {
        let collisions = null, entity = null, epsilon = 2;
        let entity_manager = manager.get('entity');
        entity_manager.move_entity(this, this.x, this.y);
      }
    });
  }

  let tpiece = null, piece_index = null, uniquer = {};
  for (piece_index in shape.pieces) {
    tpiece = shape.pieces[piece_index];
    if (uniquer[tpiece.id] === 1) {
      console.log("duplicate piece id detected");
      debugger;
    }
    uniquer[tpiece.id] = 1;
  }

  return shape;
}

function get_random_shape(index) {
  if (index === undefined) {
    index = random_int(shape_names.length); 
  }

  return hydrate_shape(shape_names[index]);
}


window.addEventListener("load", function () {
  let game_manager = GameManager();
  game_manager.init();
});
