let last_debug_change = 0, debug = false, rows = null, paused = false, last_pause_call = 0, score = 0, rows_cleared = 0, high_score = 0, high_rows = 0;
let config_spec = {
  "game": {
    "init": function (_manager) {
      this.manager = _manager;
      this.player = _manager.get('player').get_player();
      _manager.get('map').change_maps("intro", _manager.get('entity'));
    },
    "update": function (delta, entity_manager) {
      let controls = entity_manager.get_control_manager(),
        map_manager = entity_manager.get_map_manager(),
        player_manager = entity_manager.get_player_manager(),
        cookie_manager = entity_manager.get_cookie_manager(),
        audio_manager = entity_manager.get_audio_manager(),
        player = player_manager.get_player(),
        shape = null, first_color = null, color = null, piece = null,
        offset_x = 40, offset_y = 40,
        cookies = null,
        pieces = null;

      if (player.shape && player.shape.state === "done") {
        return;
      }

      if ((controls.keys('KeyP') || controls.keys('Enter') || controls.keys('Escape')) && map_manager.get_current_map_id() !== "intro") {
        if ((performance.now() - last_pause_call) > 250) {
          last_pause_call = performance.now();
          if (paused) {
            entity_manager.remove_text("pause_text");
            audio_manager.unpause_all();
          } else {
            entity_manager.add_text({
              id: "pause_text",
              text: "P A U S E",
              x: 98,
              y: 240,
              offset_type: "fixed",
              font: "48px sans bold",
              color: "red",
              update: function (delta, entity_manager) {
              }
            });
            audio_manager.pause_all();
            audio_manager.play("selection");
          }
          paused = !paused;
          player.paused = paused;
        }
      }

      if (controls.keys('Backquote') && controls.keys('ShiftLeft')) {
        last_pause_call = performance.now();
        c = controls.get_controls();
        delete c['Backquote'];
        delete c['ShiftLeft'];
        debugger;
      }

      if (paused) {
        return;
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
        rows = [
          null, null, null, null, null, null,
          null, null, null, null, null, null,
          null, null, null, null, null, null
        ];
        if (controls.buttons('start_game') || controls.keys('Enter')) {
          map_manager.change_maps("play_area", entity_manager);
          player_manager.modify_player('layer', map_manager.get_map().player_layer);
          audio_manager.play("selection");
          audio_manager.play("song_" + (random_int(3)+1));
          score = 0;
          rows_cleared = 0;
          cookies = cookie_manager.get_cookies();
          if (cookies['v0_high_score']) {
            high_score = cookies['v0_high_score'];
          }
          if (cookies['v0_high_rows']) {
            high_rows = cookies['v0_high_rows'];
          }
          // awful hack
          last_pause_call = performance.now();
        }
      } else if (map_manager.get_current_map_id() === "play_area") {
        if (player.shape === null) {
          player_manager.modify_player('x', 168);
          player_manager.modify_player('y', 40);
          if (player.next_shape) {
            player_manager.modify_player('shape', player.next_shape);
            player.shape.state = "falling";
            first_color = null;
          } else {
            player_manager.modify_player('shape', get_random_shape());
            first_color = get_random_piece_color();
          }
          player_manager.modify_player('next_shape', get_random_shape());
          player.next_shape.state = "next";
          player.next_shape.last_x = player.next_shape.x = 440;
          player.next_shape.last_y = player.next_shape.y = 88;
          let color = get_random_piece_color();
          for (next_index in player.next_shape.pieces) {
            piece = player.next_shape.pieces[next_index];
            piece.img = color;
            piece.state = "next";
            piece.x = player.next_shape.x + piece.rel_x * piece.x_size;
            piece.y = player.next_shape.y + piece.rel_y * piece.y_size;
            piece.last_x = piece.x;
            piece.last_y = piece.y;
            entity_manager.add_entity(piece);
          }

          player.shape.last_x = player.shape.x = player.x;
          player.shape.last_y = player.shape.y = player.y;
          for (piece_index in player.shape.pieces) {
            piece = player.shape.pieces[piece_index];
            if (first_color) {
              piece.img = first_color;
            }
            piece.state = "falling";
            piece.x = player.shape.x + piece.rel_x * piece.x_size;
            piece.y = player.shape.y + piece.rel_y * piece.y_size;
            piece.last_x = piece.x;
            piece.last_y = piece.y;
            entity_manager.move_entity(piece, piece.x, piece.y);
          }
        } else if (player.shape.state === "static") {
          audio_manager.play("piece_drop");
          score += random_int(3,9);
          if (score > high_score) {
            high_score = score;
          }
          console_log("calling halt on shape at x,y: " + player.shape.x + "," + player.shape.y);
          for (i in player.shape.pieces) {
            piece = player.shape.pieces[i];
            x_index = Math.round((piece.x - offset_x) / piece.x_size);
            y_index = Math.round((piece.y - offset_y) / piece.y_size);
            x_index = clamp(x_index, 0, 9);
            y_index = clamp(y_index, 0, 17);
            piece.x = x_index * piece.x_size + offset_x;
            piece.y = y_index * piece.y_size + offset_y;
            if (rows[y_index] === null) {
              rows[y_index] = [
                null,null,null,null,null,
                null,null,null,null,null
              ];
            }
            rows[y_index][x_index] = piece.id;
          }
          for (ii = 17; ii >= 0; ii--) {
            if (rows[ii] !== null) {

              for (j = 0; j < 10; j++) {
                if (!rows[ii][j]) {
                  break;
                }

//              we made it to the last piece of this loop!
                if (j === 9) {
                  console.log("j is 9");
                  rows_cleared += 1;
                  audio_manager.play("line_clear");
                  if (rows_cleared > high_rows) {
                    high_rows = rows_cleared;
                  }
                  score += 200;
                  if (score > high_score) {
                    high_score = score;
                  }
//                function clear_row_and_copy_others_down(i) {}
                  for (l = 0; l < 10; l++) {
                    if (rows[ii] === null) {
                      console.log('what the heck');
                      debugger;
                    } else {
                      entity_manager.remove_entity(rows[ii][l]);
                    }
                  }
                  for (k = ii; k > 0; k--) {
                    rows[k] = rows[k-1];
                    if (!rows[k]) {
                      // if the next row is null, skip it
                      continue;
                    }
                    for (l = 0; l < 10; l++) {
                      // need to also actually move all of those pieces
                      if (rows[k][l]) {
                        entity = entity_manager.get_entity(rows[k][l]);
                        entity_manager.move_entity(entity, entity.x, entity.y+entity.y_size);
                      }
                    }
                  }
                  // have to re-examine this row now
                  console.log("decrementing ii");
                  ii = ii + 1;
                }
              }


            }
          }
          
          // check_lines();
          if (player.shape.y < 50) {
            console.log("exited because of high static shape");
            player.shape.state = "done";
            entity_manager.add_text({
              id: "game_over",
              text: "T E T ﻿Я I S ' D !",
              x: 48,
              y: 240,
              offset_type: "fixed",
              font: "48px sans bold",
              color: "red",
              update: function (delta, entity_manager) {
              }
            });
            setTimeout(function reset_game () {
              let player = player_manager.get_player();
              player.shape = null;
              map_manager.change_maps("intro", entity_manager);
              entity_manager.remove_text("game_over");
              entity_manager.clear_entities();
              audio_manager.stop_all();
              let age = 24 * 60 * 60 * 7; // 1 week
              cookie_manager.set_cookies({
                'v0_high_score': {
                  'value': high_score,
                  'max_age': age
                },
                'v0_high_rows': {
                  'value': high_rows,
                  'max_age': age
                }
              });
            }, 2000);
          } else {
            player.shape = null;
          }
        } else { // player.shape is non-null and non-static
          player.shape.last_x = player.shape.x;
          player.shape.last_y = player.shape.y;
          player.shape.x = player.x;
          player.shape.y = player.y;

          pieces = player.shape.pieces;
          player.shape.lowest_x = Math.min(
            pieces[0].x, pieces[1].x, pieces[2].x, pieces[3].x
          );
          player.shape.highest_x = 32 + Math.max(
            pieces[0].x, pieces[1].x, pieces[2].x, pieces[3].x
          );

          player.shape.lowest_y = Math.min(
            pieces[0].y, pieces[1].y, pieces[2].y, pieces[3].y
          );
          player.shape.highest_y = 32 + Math.max(
            pieces[0].y, pieces[1].y, pieces[2].y, pieces[3].y
          );
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
    "x": 168,
    "y": 72,
    "layer": 2,
    "x_scale": 1,
    "y_scale": 1,
    "x_size": 32,
    "y_size": 32,
    "x_velocity": 0,
    "y_velocity": 0,
    "max_x_velocity": 32,
    "min_x_velocity": -32,
    "max_y_velocity": 5,
    "min_y_velocity": 0.5,
    "next_shape": null,
    "shape": null,
    "score": 0,
    "paused": false,
    "update": function (delta, entity_manager) {
      let map_manager = entity_manager.get_map_manager(),
        controls = entity_manager.get_control_manager();

      if (map_manager.get_current_map_id() === "intro" || this.paused) {
      } else if (map_manager.get_current_map_id() === "play_area") {
        if (controls.keys('KeyW') || controls.keys('ArrowUp') || controls.keys('Space')) {
          if (!this.last_rotated || (performance.now() - this.last_rotated) > 150) {
            rotate_shape(this.shape, 90);
            this.last_rotated = performance.now();
          }
        } else if (controls.keys('KeyS') || controls.keys('ArrowDown')) {
          this.y_velocity = 5 * delta;
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
        if (this.shape && this.shape.lowest_x) {
          this.x = clamp(
            this.x,
            bounds.x + 40 + (this.shape.x - this.shape.lowest_x),
            bounds.width - (this.shape.highest_x - this.shape.x),
          );
          this.y = clamp(
            this.y,
            bounds.y + 40 + (this.shape.y - this.shape.lowest_y),
            bounds.height - (this.shape.highest_y - this.shape.y),
          );
        } else {
          this.x = clamp(this.x, bounds.x, bounds.width - this.x_size);
          this.y = clamp(this.y, bounds.y, bounds.height - this.y_size);
        }

        entity_manager.move_entity(this, this.x, this.y);
        entity_manager.get_camera_manager().center(-40, -40);
      }
    }
  },
  "camera": {
    "x": 0,
    "y": 0,
    "width": 360,
    "height": 576,
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
      "width": 360,
      "height": 616,
      "id": "intro",
      "player_layer": 2,
      "init": function (entity_manager) {
        let ui_manager = entity_manager.get_ui_manager();

        ui_manager.add_button({
          id: "start_game",
          x: 40,
          y: 40,
          width: 320,
          height: 576,
          text: '',
          style: 'color: white; font-size: 1.4em; text-align: center'
        });
        console.log("map " + this.id + ": initialized");
      },
      "deinit": function (entity_manager) {
        let ui_manager = entity_manager.get_ui_manager();
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
        [
          {
            "id": "background_black",
            "img": "background_black",
            "x": 40,
            "y": 40,
            "x_scale": 10,
            "y_scale": 18,
            "x_size": 320,
            "y_size": 576,
            "layer": -0.5,
          }
        ],
        [
          {
            x: 40,
            y: 160,
            x_size: 320,
            y_size: 94,
            x_scale: 1,
            y_scale: 1,
            img: "logo",
            id: "logo",
            layer: 1,
          },
          {
            x: 110,
            y: 280,
            x_size: 176,
            y_size: 144,
            x_scale: 1,
            y_scale: 1,
            img: "castle",
            id: "castle",
            layer: 1,
          },
          {
            x: 144,
            y: 475,
            x_size: 107,
            y_size: 31,
            x_scale: 1,
            y_scale: 1,
            img: "start",
            id: "start",
            layer: 1,
          }
        ]
      ]
    },
    "play_area": {
      "id": "play_area",
      "width": 360,
      "height": 616,
      "player_layer": 2,
      "init": function (entity_manager) {
        entity_manager.add_text({
          id: "score",
          text: "score:",
          x: 384,
          y: 256,
          offset_type: "fixed",
          font: "16px sans bold",
          color: "white",
          update: function (delta, entity_manager) {
            if (score >= high_score) {
              this.color = "red";
            } else {
              this.color = "white";
            }
            this.text = "score: " + score;
          }
        });
        entity_manager.add_text({
          id: "high_score",
          text: "high score: ",
          x: 384,
          y: 276,
          offset_type: "fixed",
          font: "16px sans bold",
          color: "white",
          update: function (delta, entity_manager) {
            if (score >= high_score) {
              this.color = "red";
            } else {
              this.color = "white";
            }
            this.text = "hi score: " + high_score;
          }
        });
        entity_manager.add_text({
          id: "rows_cleared",
          text: "rows: ",
          x: 384,
          y: 296,
          offset_type: "fixed",
          font: "16px sans bold",
          color: "white",
          update: function (delta, entity_manager) {
            if (rows_cleared >= high_rows) {
              this.color = "red";
            } else {
              this.color = "white";
            }
            this.text = "rows: " + rows_cleared;
          }
        });
        entity_manager.add_text({
          id: "high_rows",
          text: "high_rows: ",
          x: 384,
          y: 316,
          offset_type: "fixed",
          font: "16px sans bold",
          color: "white",
          update: function (delta, entity_manager) {
            if (rows_cleared >= high_rows) {
              this.color = "red";
            } else {
              this.color = "white";
            }
            this.text = "hi rows: " + high_rows;
          }
        });
      },
      "deinit": function (entity_manager) {
        entity_manager.remove_text("score");
        entity_manager.remove_text("high_score");
        entity_manager.remove_text("rows_cleared");
        entity_manager.remove_text("high_rows");
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
        [
          {
            "id": "background_black",
            "img": "background_black",
            "x": 40,
            "y": 40,
            "x_scale": 10,
            "y_scale": 18,
            "x_size": 320,
            "y_size": 576,
            "layer": -0.5,
          },
          {
            "id": "next_piece_box",
            "img": "background_black",
            "x": 376,
            "y": 40,
            "x_scale": 5,
            "y_scale": 5,
            "x_size": 160,
            "y_size": 160,
            "layer": -0.5,
          },
          {
            "id": "next_piece_box",
            "img": "background_black",
            "x": 376,
            "y": 232,
            "x_scale": 5,
            "y_scale": 3,
            "x_size": 160,
            "y_size": 96,
            "layer": -0.5,
          }
        ] // layer
      ]   // array of layers
    },    // map object
  },      // maps object
  "resources": [
    {
      "type": "sound",
      "url": "resources/sounds/tetris_song_1.mp3",
      "id": "song_1",
      "muted": false,
      "volume": 0.1,
      "looping": true,
    },
    {
      "type": "sound",
      "url": "resources/sounds/tetris_song_2.mp3",
      "id": "song_2",
      "muted": false,
      "volume": 0.1,
      "looping": true,
    },
    {
      "type": "sound",
      "url": "resources/sounds/tetris_song_3.mp3",
      "id": "song_3",
      "muted": false,
      "volume": 0.1,
      "looping": true,
    },
    {
      "type": "sound",
      "url": "resources/sounds/line_clear.mp3",
      "id": "line_clear",
      "muted": false,
      "volume": 0.3,
      "looping": false,
    },
    {
      "type": "sound",
      "url": "resources/sounds/piece_drop.mp3",
      "id": "piece_drop",
      "muted": false,
      "volume": 0.05,
      "looping": false,
    },
    {
      "type": "sound",
      "url": "resources/sounds/selection.mp3",
      "id": "selection",
      "muted": false,
      "volume": 0.3,
      "looping": false,
    },
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
    {
      "type": "image",
      "url": "resources/images/castle.png",
      "id": "castle",
      "source_x": 0,
      "source_y": 0,
      "source_width": 176,
      "source_height": 144,
    },
    {
      "type": "image",
      "url": "resources/images/logo_smaller.png",
      "id": "logo",
      "source_x": 0,
      "source_y": 0,
      "source_width": 320,
      "source_height": 94,
    },
    {
      "type": "image",
      "url": "resources/images/start.png",
      "id": "start",
      "source_x": 0,
      "source_y": 0,
      "source_width": 107,
      "source_height": 31,
    },
    {
      "type": "image",
      "url": "resources/images/level_6_tile_1.png",
      "id": "level_6_tile_1",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/level_6_tile_2.png",
      "id": "level_6_tile_2",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/level_6_tile_3.png",
      "id": "level_6_tile_3",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/level_6_tile_4.png",
      "id": "level_6_tile_4",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/level_6_tile_5.png",
      "id": "level_6_tile_5",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/level_6_tile_6.png",
      "id": "level_6_tile_6",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
  ],          // resources array
};            // config object
