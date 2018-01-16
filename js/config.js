let last_debug_change = 0, debug = false;
let config_spec = {
  "game": {
    "init": function (entity_manager, control_manager, ui_manager, map_manager, player_manager, request_manager) {
      this.player = player_manager.get_player();
      map_manager.change_maps("intro", entity_manager);
    },
    "update": function (delta, entity_manager) {
      let controls = entity_manager.get_control_manager(),
        map_manager = entity_manager.get_map_manager(),
        player_manager = entity_manager.get_player_manager(),
        player = player_manager.get_player(),
        shape = null, color = null;

      if (player.shape && player.shape.state === "done") {
        return;
      }

      if (controls.keys('KeyP')) {
        c = controls.get_controls();
        delete c['KeyP'];
        debugger;
      }

      if (controls.keys('KeyT')) {
        if (performance.now() - last_debug_change > 100) {
          last_debug_change = performance.now();
          if (!debug) {
            debug = true;
            entity_manager.add_text({
              id: "debug_mode",
              text: "debugging logging enabled!",
              x: 360,
              y: 48,
              offset_type: "fixed",
              font: "24px sans",
              color: "white",
              update: function (delta, entity_manager) {
              }
            });
          } else {
            entity_manager.remove_text("debug_mode");
            debug = false;
          }
        }
      }

      if (map_manager.get_current_map_id() === "intro") {
        if (controls.buttons('start_game') || controls.keys('Enter')) {
          map_manager.change_maps("play_area", entity_manager);
          player_manager.modify_player('layer', map_manager.get_map().player_layer);
        }
      } else if (map_manager.get_current_map_id() === "play_area") {
        if (player.shape === null) {
          player_manager.modify_player('x', 128);
          player_manager.modify_player('y', 0);
          player_manager.modify_player('shape', get_random_shape());
          player.shape.last_x = player.shape.x = player.x;
          player.shape.last_y = player.shape.y = player.y;
          color = get_random_piece_color();
          for (i in player.shape.pieces) {
            piece = player.shape.pieces[i];
            piece.img = color;
            piece.x = player.shape.x + piece.rel_x * piece.x_size;
            piece.y = player.shape.y + piece.rel_y * piece.y_size;
            piece.last_x = piece.x;
            piece.last_y = piece.y;
            entity_manager.add_entity(piece);
          }
        } else if (player.shape.state === "static") {
          console_log("calling halt on shape at x,y: " + player.shape.x + "," + player.shape.y);
          // check_lines();
          if (player.shape.y < 10) {
            map_manager.change_maps("intro", entity_manager);
            entity_manager.clear_entities();
            console.log("exited because of high static shape");
          }
          player.shape = null;
        } else { // player.shape is non-null and non-static
          player.shape.last_x = player.shape.x;
          player.shape.last_y = player.shape.y;
          player.shape.x = player.x;
          player.shape.y = player.y;
          if (player.shape.last_y === player.shape.y) {
            console.log("static-tize them, cap'n!!!");
            player.shape.halt(entity_manager);
          }
        }
      }
    }
  },
  "canvas_id": "canvas",
  "stage_id": "stage",
  "fullscreen": true,
  "frames_per_second": 40,
  "resource_url": "resources.json",
  "controls": null,
  "base_url": "",
  "player": {
    "id": "player1",
    "img": "nonexistent",
    "x": 128,
    "y": 20,
    "layer": 2,
    "x_scale": 1,
    "y_scale": 1,
    "x_size": 32,
    "y_size": 32,
    "x_velocity": 0,
    "y_velocity": 0,
    "max_x_velocity": 32,
    "min_x_velocity": -32,
    "max_y_velocity": 3,
    "min_y_velocity": 0.5,
    "shape": null,
    "score": 0,
    "update": function (delta, entity_manager) {
      let map_manager = entity_manager.get_map_manager(),
        controls = entity_manager.get_control_manager();

      if (map_manager.get_current_map_id() === "intro") {
      } else if (map_manager.get_current_map_id() === "play_area") {
        if (controls.keys('KeyW') || controls.keys('ArrowUp') || controls.keys('Space')) {
          if (!this.last_rotated || (performance.now() - this.last_rotated) > 150) {
            rotate_shape(this.shape, 90);
            this.last_rotated = performance.now();
          }
        } else if (controls.keys('KeyS') || controls.keys('ArrowDown')) {
          this.y_velocity = 3 * delta;
        } else {
          this.y_velocity *= 0.5;
        }

        if (controls.keys('KeyA') || controls.keys('ArrowLeft')) {
          this.x_velocity = -32;
        } else if (controls.keys('KeyD') || controls.keys('ArrowRight')) {
          this.x_velocity = 32;
        } else {
          this.x_velocity = 0;
        }

        this.x_velocity = clamp(
          this.x_velocity, this.min_x_velocity, this.max_x_velocity
        );
        this.y_velocity = clamp(
          this.y_velocity, this.min_y_velocity, this.max_y_velocity
        );

        if (!this.last_moved || (performance.now() - this.last_moved) > 80) {
          this.x += this.x_velocity;
          this.last_moved = performance.now();
        }
        this.y += this.y_velocity;

        let bounds = map_manager.get_bounds();
        this.x = clamp(this.x, bounds.x, bounds.width - this.x_size);
        this.y = clamp(this.y, bounds.y, bounds.height - this.y_size);

        entity_manager.move_entity(this, this.x, this.y);
        entity_manager.get_camera_manager().center(0, 0);
      }
    }
  },
  "camera": {
    "x": 0,
    "y": 0,
    "width": 320,
    "height": 512,
    "left_margin": 96,
    "right_margin": 96,
    "top_margin": 100,
    "bottom_margin": 100,
  },
  "initial_map_id": "intro",
  "maps": {
    "to_load": [
    ],
    "intro": {
      "width": 320,
      "height": 512,
      "id": "intro",
      "player_layer": 2,
      "init": function (entity_manager) {
        ui_manager = entity_manager.get_ui_manager();

        entity_manager.add_text({
          id: "intro_text",
          text: "T E T R I S ! ! !",
          x: 30,
          y: 210,
          offset_type: "fixed",
          font: "44px sans",
          color: "red",
          update: function (delta, entity_manager) {
          }
        });

        ui_manager.add_button({
          id: "start_game",
          x: 150,
          y: 350,
          width: 100,
          height: 50,
          text: "<p style='margin: 8px 0'>START!</p>",
          background: "white",
          style: 'color: black; text-align: center'
        });
        console.log("map " + this.id + ": initialized");
      },
      "deinit": function (entity_manager) {
        ui_manager = entity_manager.get_ui_manager();
        entity_manager.remove_text("intro_text");
        ui_manager.remove_button("start_game");
        console.log("map " + this.id + ": de-initialized");
      },
      "layers": [
        [
          {
            "id": "bg1",
            "img": "background_blue",
            "x": -3200,
            "y": -3200,
            "x_scale": 300,
            "y_scale": 300,
            "x_size": 6400,
            "y_size": 6400,
            "layer": -1,
          }
        ],
      ]
    },
    "play_area": {
      "id": "play_area",
      "width": 320,
      "height": 512,
      "player_layer": 2,
      "layers": [
        [
          {
            "id": "bg1",
            "img": "background_blue",
            "x": -3200,
            "y": -3200,
            "x_scale": 300,
            "y_scale": 300,
            "x_size": 6400,
            "y_size": 6400,
            "layer": -1,
          }
        ],
        [
          {
            "id": "background_black",
            "img": "background_black",
            "x": 0,
            "y": 0,
            "x_scale": 10,
            "y_scale": 16,
            "x_size": 320,
            "y_size": 512,
            "layer": -0.5,
          }
        ] // layer
      ]   // array of layers
    },    // map object
  },      // maps object
  "resources": [
    {
      "type": "image",
      "url": "resources/images/base_tile_red.png",
      "id": "base_tile_red",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/base_tile_grey.png",
      "id": "base_tile_grey",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/base_tile_black.png",
      "id": "base_tile_black",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/base_tile_white.png",
      "id": "base_tile_white",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/top_left_corner.png",
      "id": "top_left_corner",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/top_right_corner.png",
      "id": "top_right_corner",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/bottom_left_corner.png",
      "id": "bottom_left_corner",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/bottom_right_corner.png",
      "id": "bottom_right_corner",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/background_black.png",
      "id": "background_black",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/background_blue.png",
      "id": "background_blue",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
  ],          // resources array
};            // config object
