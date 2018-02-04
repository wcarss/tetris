function rotate_shape(shape, direction) {
  let box = null, new_coordinates = null;

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
var shapes = {
  triforce: [[-1, 0], [0, 0], [1,  0], [0,  1]],
  line:     [[-1, 0], [0, 0], [1,  0], [2,  0]],
  box:      [[ 0, 0], [0, 1], [1,  0], [1,  1]],
  zig:      [[-1, 0], [0, 0], [0, -1], [1, -1]],
  zag:      [[-1, 0], [0, 0], [0,  1], [1,  1]],
  left:     [[-1, 0], [0, 0], [1,  0], [1, -1]],
  right:    [[-1, 0], [0, 0], [1,  0], [1,  1]]
};

var shape_names = [
  'triforce',
  'line',
  'box',
  'zig',
  'zag',
  'right',
  'left'
];

function hydrate_shape(shape_name) {
  let tile = null,
    spec = shapes[shape_name];
    shape = {
      x: 0, y: 0,
      name: shape_name,
      pieces: [],
      state: "falling",
      moved_count: 0,
      moved: {},
      lowest_x: 0, highest_x: 0,
      lowest_y: 0, highest_y: 0,
      halt: function (manager) {
        let piece = null, reset = null;
        console_log("halting shape at x,y: " + this.x + "," + this.y + " w/ state: " + this.state);

        for (i in this.pieces) {
          piece = this.pieces[i];
          if (this.moved[piece.id]) {
            reset = true;
            console_log("calling halt for piece " + piece.id + " && setting reset");
          } else {
            console_log("calling halt for piece " + piece.id + " && NOT setting reset");
          }
          this.pieces[i].halt(manager, reset);
          reset = false;
        }

        this.state = "static";
      },
      track_movement: function (id) {
        this.moved_count += 1;
        this.moved[id] = true;
        if (this.moved_count > 3) {
          /* > 2 indicates all pieces moved successfully */
          this.moved_count = 0;
          this.moved = {};
          console_log("resetting this.moved in track_movement");
        }
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
      id: "piece-" + timestamp_id().slice(-7),
      type: "piece",
      img: null, // gonna have to think about this
      rel_x: tile[0],
      rel_y: tile[1],
      shape: shape,
      state: "falling",
      update: function (delta, manager) {
        let collisions = null, entity = null, epsilon = 2;
        let entity_manager = manager.get('entity');

        if (!this.active) {
          return;
        }

        if (this.state === "falling") {
          this.last_x = this.x
          this.last_y = this.y;
          this.x = Math.floor(this.shape.x) + this.rel_x * this.x_size;
          this.y = Math.floor(this.shape.y) + this.rel_y * this.y_size;
          collisions = entity_manager.collide(this);
          for (i in collisions) {
            entity = collisions[i];
            if (entity.type && entity.type === "piece" && entity.state !== "falling") {
              if (entity.x-epsilon < this.x && entity.x + epsilon > this.x && entity.y > this.y+15) {
                console_log("issuing shape halt from piece " + this.id + " at " + this.x + "," + this.y + " w/ lx,ly: " + this.last_x + "," + this.last_y);
                this.x = this.last_x;
                this.y = this.last_y;
                this.shape.halt(manager);
                return;
              }
            }
          }
          console_log("moving piece " + this.id + " to " + this.x + "," + this.y + " w/ lx,ly: " + this.last_x + "," + this.last_y); 
          this.shape.track_movement(this.id);
          entity_manager.move_entity(this, this.x, this.y);
        }
      },
      halt: function (manager, reset) {
        this.shape = null;
        if (this.state !== "static") {
          this.state = "static";
          if (reset) {
            console_log("halting & resetting piece: " + this.id + " - x,y: " + this.x + "," + this.y + " && lx,ly: " + this.last_x + "," + this.last_y);
            this.x = this.last_x;
            this.y = this.last_y;
            manager.get('entity').move_entity(this, this.x, this.y);
          } else {
            console_log("halting & not resetting piece: " + this.id + " - x,y: " + this.x + "," + this.y);
          }
        }
      }
    });
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
  game_manager = GameManager();
  game_manager.init();
});
