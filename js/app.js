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
  let colors = [
    "base_tile_grey",
    "base_tile_white",
    "base_tile_black",
    "base_tile_red",
  ];

  return array_random(colors);
}
/*
function draw_shape(shape, context) {
  let box = null;

  for (i in shape.pieces) {
    box = shape.pieces[i];
    draw_box(
      shape.x+box.rel_x,
      shape.y+box.rel_y,
      shape.inner_color,
      shape.outer_color,
      context
    );
  }
}


function draw_box(x, y, color1, color2, context) {
  let grid_size = 20;
  let x_offset = 20;
  let y_offset = 20;

  context.fillStyle = color1;
  context.fillRect(
    x_offset + x * grid_size,
    y_offset + y * grid_size,
    grid_size,
    grid_size
  );

  context.fillStyle = color2;
  context.fillRect(
    x_offset + x * grid_size + 1,
    y_offset + y * grid_size + 1,
    grid_size - 2,
    grid_size - 2
  );
}
*/

/*
let shape_objects = {
  triforce: [
    { rel_x: -1, rel_y: 0, },
    { rel_x: 0,  rel_y: 0, },
    { rel_x: 1,  rel_y: 0, },
    { rel_x: 0,  rel_y: 1, },
  ],
  line: [
    { rel_x: -1, rel_y: 0, },
    { rel_x: 0,  rel_y: 0 },
    { rel_x: 1,  rel_y: 0 },
    { rel_x: 2,  rel_y: 0 },
  ],
  box: [
    { rel_x: 0, rel_y: 0 },
    { rel_x: 0, rel_y: 1 },
    { rel_x: 1, rel_y: 0 },
    { rel_x: 1, rel_y: 1 },
  ],
  zig: [
    { rel_x: -1, rel_y: 0 },
    { rel_x: 0,  rel_y: 0 },
    { rel_x: 0,  rel_y: -1 },
    { rel_x: 1,  rel_y: -1 },
  ],
  zag: [
    { rel_x: -1, rel_y: 0 },
    { rel_x: 0,  rel_y: 0 },
    { rel_x: 0,  rel_y: 1 },
    { rel_x: 1,  rel_y: 1 },
  ],
  left: [
    { rel_x: -1, rel_y: 0 },
    { rel_x: 0,  rel_y: 0 },
    { rel_x: 1,  rel_y: 0 },
    { rel_x: 1,  rel_y: -1 },
  ],
  right: [
    { rel_x: -1, rel_y: 0 },
    { rel_x: 0,  rel_y: 0 },
    { rel_x: 1,  rel_y: 0 },
    { rel_x: 1,  rel_y: 1 },
  ]
};
*/


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
      halt: function (entity_manager) {
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
          this.pieces[i].halt(entity_manager, reset);
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
      update: function (delta, entity_manager) {
        let collisions = null, entity = null;

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
                console_log("issuing shape halt from piece " + this.id + " at " + this.x + "," + this.y + " w/ lx,ly: " + this.last_x + "," + this.last_y);
                this.x = this.last_x;
                this.y = this.last_y;
                shape.halt(entity_manager);
                return;
            }
          }
          console_log("moving piece " + this.id + " to " + this.x + "," + this.y + " w/ lx,ly: " + this.last_x + "," + this.last_y); 
          this.shape.track_movement(this.id);
          entity_manager.move_entity(this, this.x, this.y);
        }
      },
      halt: function (entity_manager, reset) {
        this.shape = null;
        if (this.state !== "static") {
          this.state = "static";
          if (reset) {
            console_log("halting & resetting piece: " + this.id + " - x,y: " + this.x + "," + this.y + " && lx,ly: " + this.last_x + "," + this.last_y);
            this.x = this.last_x;
            this.y = this.last_y;
            entity_manager.move_entity(this, this.x, this.y);
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
  game_manager.start_game();
});
