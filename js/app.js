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
      save_location: function () {
        let index = null;
        let piece = null;

        this.last_x = this.x;
        this.last_y = this.y;
        for (index in this.pieces) {
          piece = this.pieces[index];
          piece.last_x = piece.x;
          piece.last_y = piece.y;
        }
      },
      rotate: function (degrees) {
        rotate_shape(this, degrees);
      },
      move: function (x, y) {
        let index = null;
        let piece = null;

        this.x = x;
        this.y = y;
        for (index in this.pieces) {
          piece = this.pieces[index];
          piece.x = Math.floor(this.x) + piece.rel_x * piece.x_size;
          piece.y = Math.floor(this.y) + piece.rel_y * piece.y_size;
        }
      },
      collide: function (manager) {
        let index = null;
        let piece = null;
        let collisions = null;
        let collision_index = null;
        let collision = null;
        let entity = null;
        let y_collision = null;
        let x_collision = null;
        let physics = manager.get('physics');
        let entity_manager = manager.get('entity');

        for (index in this.pieces) {
          piece = this.pieces[index];
          collisions = entity_manager.collide(piece);
          for (collision_index in collisions) {
            entity = collisions[collision_index];

            if (entity.type === "bound" || (entity.type === "piece" && entity.state === "static")) {
              collision = physics.directional_collide(piece, entity);
              if (collision) {
                if (collision.top && piece.last_x === piece.x) {
                  console_log("in collider, y collision detected");
                  y_collision = true;
                } else {
                  console_log("in collider, x collision detected");
                  x_collision = true;
                }

                break;
              }
            }
          }
          if (y_collision || x_collision) {
            break;
          }
        }

        if (y_collision || x_collision) {
          console_log("returning collisions x, y: " + x_collision + ", " + y_collision);
          return {
            y: y_collision,
            x: x_collision,
          };
        }

        return null;
      },
      halt: function () {
        let index = null;
        let piece = null;
        let that = this;
        let offset_x = 40;
        let offset_y = 40;
        let x_index = 0;
        let y_index = 0;
        let slide_time = 300;

        this.state = "sliding";
        for (index in this.pieces) {
          piece = this.pieces[index];
          piece.state = "sliding";

          x_index = Math.round((piece.x - offset_x) / piece.x_size);
          y_index = Math.round((piece.y - offset_y) / piece.y_size);
          x_index = clamp(x_index, 0, 9);
          y_index = clamp(y_index, 0, 17);
          piece.x = x_index * piece.x_size + offset_x;
          piece.y = y_index * piece.y_size + offset_y;
        }
        console_log("setting pieces and shape to sliding.");
        this.static_timeout = setTimeout(function () {
          let inner_index = null;

          that.state = "static";
          for (inner_index in that.pieces) {
            that.pieces[inner_index].state = "static";
          }
          console_log("setting pieces and shape to static.");
        }, slide_time);
      },
      reset_to_falling: function () {
        let index = null;

        clearTimeout(this.static_timeout);
        this.state = "falling";
        for (index in this.pieces) {
          this.pieces[index].state = "falling";
        }
        console_log("resetting to falling");
      }
    };

  for (tile_index in spec) {
    tile = spec[tile_index];
    shape.pieces.push({
      x: 0, y: 0,
      x_size: 32, y_size: 32,
      x_scale: 1, y_scale: 1,
      layer: 1,
      active: true,
      id: "piece-" + tile_index + "-" + timestamp_id().slice(-10),
      type: "piece",
      img: null, // gonna have to think about this
      rel_x: tile[0],
      rel_y: tile[1],
      shape: shape,
      state: "falling",
      update: function (delta, manager) {
        manager.get('entity').move_entity(this, this.x, this.y);
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
