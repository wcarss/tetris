"use strict";
let last_debug_change = 0, debug = false, rows = null, paused = false, last_pause_call = 0, score = 0, rows_cleared = 0, high_score = 0, high_rows = 0;
let config_spec = {
  "game": {
    "init": function (_manager) {
      this.manager = _manager;
      this.player = _manager.get('player').get_player();
      _manager.get('map').change_maps("intro");
    },
    "post_resource_load": function (manager) {
      generate_level_resources(manager);
    },
    "update": function (delta, manager) {
      let controls = manager.get('control'),
        ui = manager.get('ui'),
        entity_manager = manager.get('entity'),
        map_manager = manager.get('map'),
        player_manager = manager.get('player'),
        cookie_manager = manager.get('cookie'),
        audio_manager = manager.get('audio'),
        player = player_manager.get_player(),
        shape = null, first_color = null, color = null, piece = null,
        offset_x = 40, offset_y = 40,
        cookies = null,
        pieces = null,
        next_index = null,
        piece_index = null,
        shape_piece_index = null,
        x_index = null,
        y_index = null,
        entity = null;

      if (player.shape && player.shape.state === "done") {
        return;
      }

      let map_id = map_manager.get_current_map_id();
      if ((controls.keys('KeyP') || controls.keys('Enter') || controls.keys('Escape')) && map_id !== "intro" && map_id !== "setup" && map_id !== "menu") {
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
              update: function (delta, manager) {
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
        let c = controls.get_controls();
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
              update: function (delta, manager) {
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
          map_manager.change_maps("setup");
          audio_manager.play("selection");
          last_pause_call = performance.now();
        }
      } else if (map_manager.get_current_map_id() === "setup") {
        let previous_game_length = player.game_length;
        let button_hit = false;

        ui.set_button_state("length_" + player.game_length, "selected");

        if (controls.buttons('length_fast')) {
          player.game_length = "fast";
        } else if (controls.buttons('length_standard')) {
          player.game_length = "standard";
        } else if (controls.buttons('length_long')) {
          player.game_length = "long";
        } else if (controls.buttons('length_epic')) {
          player.game_length = "epic";
        } else if (controls.buttons('length_marathon')) {
          player.game_length = "marathon";
        } else if (controls.buttons('length_methuselah')) {
          player.game_length = "methuselah";
        }

        if (previous_game_length !== player.game_length) {
          ui.set_button_state("length_" + previous_game_length, "deselected");
          ui.set_button_state("length_" + player.game_length, "selected");
        }

        let previous_game_type = player.game_type;

        ui.set_button_state("mode_" + player.game_type, "selected");

        if (controls.buttons('mode_static')) {
          player.game_type = "static";
        } else if (controls.buttons('mode_progression')) {
          player.game_type = "progression";
        } else if (controls.buttons('mode_random')) {
          player.game_type = "random";
        }

        if (previous_game_type !== player.game_type) {
          ui.set_button_state("mode_" + previous_game_type, "deselected");
          ui.set_button_state("mode_" + player.game_type, "selected");
        }

        let previously_muted = audio_manager.are_all_muted();

        if (previously_muted) {
          ui.set_button_state("mute_all", "selected");
        } else {
          ui.set_button_state("unmute_all", "selected");
        }

        if (controls.buttons('mute_all')) {
          audio_manager.mute_all();
          ui.set_button_state("mute_all", "selected");
          ui.set_button_state("unmute_all", "deselected");
        } else if (controls.buttons('unmute_all')) {
          audio_manager.unmute_all();
          ui.set_button_state("mute_all", "deselected");
          ui.set_button_state("unmute_all", "selected");
        }

        if ((
          previously_muted !== audio_manager.are_all_muted() ||
          previous_game_type !== player.game_type ||
          previous_game_length !== player.game_length
        ) && !audio_manager.are_all_muted()) {
          audio_manager.play("menu_beep");
        }

        if (performance.now() - last_pause_call > 150 && (controls.buttons('start_game') || controls.keys('Enter'))) {
          rows = [
            null, null, null, null, null, null,
            null, null, null, null, null, null,
            null, null, null, null, null, null
          ];
          map_manager.change_maps("play_area");
          player_manager.modify_player('layer', map_manager.get_map().player_layer);
          audio_manager.play("game_start");
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
      } else if (map_manager.get_current_map_id() === "menu") {
        // .. do nothing!
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
            first_color = get_random_piece_color(player.level);
          }
          player_manager.modify_player('next_shape', get_random_shape());
          player.next_shape.state = "next";
          player.next_shape.last_x = player.next_shape.x = 440;
          player.next_shape.last_y = player.next_shape.y = 88;
          color = get_random_piece_color(player.level);
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
          for (shape_piece_index in player.shape.pieces) {
            piece = player.shape.pieces[shape_piece_index];
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
          let last_rows_cleared = rows_cleared;
          for (let ii = 17; ii >= 0; ii--) {
            if (rows[ii] !== null) {

              for (let j = 0; j < 10; j++) {
                if (!rows[ii][j]) {
                  break;
                }

//              we made it to the last piece of this loop!
                if (j === 9) {
                  rows_cleared += 1;
//                function clear_row_and_copy_others_down(i) {}
                  for (let l = 0; l < 10; l++) {
                    if (rows[ii] === null) {
                      console.log('what the heck');
                      debugger;
                    } else {
                      entity_manager.remove_entity(rows[ii][l]);
                    }
                  }
                  for (let k = ii; k > 0; k--) {
                    rows[k] = rows[k-1];
                    if (!rows[k]) {
                      // if the next row is null, skip it
                      continue;
                    }
                    for (let l = 0; l < 10; l++) {
                      // need to also actually move all of those pieces
                      if (rows[k][l]) {
                        entity = entity_manager.get_entity(rows[k][l]);
                        if (entity) {
                          entity_manager.move_entity(
                            entity,
                            entity.x,
                            entity.y+entity.y_size
                          );
                        } else {
                          console.log("rows[k][l] was true, but entity is not. debugger time!");
                          debugger;
                        }
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

          if (rows_cleared - last_rows_cleared >= 4) {
            score += 1000;
            audio_manager.play("4_rows");
          } else if (rows_cleared - last_rows_cleared >= 2) {
            score += 200;
            audio_manager.play("line_clear");
          } else if (rows_cleared - last_rows_cleared >= 1 ) {
            score += 50;
            audio_manager.play("line_clear");
          } else {
            audio_manager.play("piece_drop");
            score += random_int(3,9);
          }

          if (score > high_score) {
            high_score = score;
          }
          if (rows_cleared > high_rows) {
            high_rows = rows_cleared;
          }

          let progression_length = {
            "methuselah": 100,
            "marathon": 50,
            "epic": 30,
            "long": 20,
            "standard": 10,
            "fast": 2,
          }[player.game_length];

          let new_progress = Math.floor(rows_cleared / progression_length);
          if (rows_cleared !== last_rows_cleared && new_progress > player.progress) {
            console.log("going to change levels");
            audio_manager.play("level_up");
            if (player.game_type === "progression") {
              player.level += new_progress-player.progress;
              player.drop_speed_mod = player.get_speed(player.level);
              if (player.level > 10) {
                console.log("... you win.");
              }
            } else if (player.game_type === "random") {
              player.level = array_random([
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10
              ]);
              player.drop_speed_mod = player.get_speed(player.level);
            }
            player.progress = new_progress;
         }

          // check_lines();
          if (player.shape.y < 50) {
            console.log("exited because of high static shape");
            player.shape.state = "done";
            audio_manager.stop_all();
            audio_manager.play("game_over");
            entity_manager.add_text({
              id: "game_over",
              text: "T E T ﻿Я I S ' D !",
              x: 48,
              y: 240,
              offset_type: "fixed",
              font: "48px sans bold",
              color: "red",
              update: function (delta, manager) {
              }
            });
            setTimeout(function reset_game () {
              let player = player_manager.get_player();
              player.shape = null;
              player.next_shape = null;
              player.level = 1;
              player.drop_speed_mod = 0;
              player.progress = 0;
              map_manager.change_maps("intro");
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
    "max_y_velocity": 4,
    "min_y_velocity": 0.5,
    "next_shape": null,
    "shape": null,
    "score": 0,
    "base_drop_speed": 0.5,
    "drop_speed_mod": 0,
    "get_speed": function (level) {
      let difficulties = [
        0.6, 1, 1.3, 1.6, 1.9, 2.1, 2.4, 2.6, 2.8, 3
      ];

      if (level > difficulties.length) {
        level = difficulties.length - 1;
      }

      return difficulties[level-1];
    },
    "level": 1,
    "progress": 0,
    "game_length": "standard",
    "game_type": "progression",
    "paused": false,
    "update": function (delta, manager) {
      let map_manager = manager.get('map'),
        physics = manager.get('physics'),
        controls = manager.get('control'),
        audio_manager = manager.get('audio'),
        entity_manager = manager.get('entity'),
        rotated = null,
        collision = null;

      if (map_manager.get_current_map_id() === "intro" || this.paused) {
      } else if (map_manager.get_current_map_id() === "play_area") {
        this.last_x = this.x;
        this.last_y = this.y;

        if (controls.keys('KeyW') || controls.keys('ArrowUp') || controls.keys('Space')) {
          if (!this.last_rotated || (performance.now() - this.last_rotated) > 150 && this.shape) {
            rotated = true;
            this.last_rotated = performance.now();
          }
        } else if (controls.keys('KeyS') || controls.keys('ArrowDown')) {
          this.y_velocity = 10;
        } else {
          this.y_velocity = this.base_drop_speed + this.drop_speed_mod;
        }

        if (controls.keys('KeyA') || controls.keys('ArrowLeft')) {
          this.x_velocity = -32;
        } else if (controls.keys('KeyD') || controls.keys('ArrowRight')) {
          this.x_velocity = 32;
        } else {
          this.x_velocity = 0;
        }

        if (!this.last_moved || (performance.now() - this.last_moved) > 80) {
          this.x += this.x_velocity;
          if (this.x !== this.last_x) {
            audio_manager.play("block_slide");
          }
          this.last_moved = performance.now();
        }

        this.y += this.y_velocity;

        if (this.shape && (this.shape.state === "falling" || this.shape.state === "sliding")) {
          this.shape.save_location();
          if (rotated) {
            this.shape.rotate(90);
            audio_manager.play("block_rotate");
          }

          this.shape.move(this.x, this.y);

          collision = this.shape.collide(manager);
          if (collision) {
            if (rotated) {
              rotate_shape(this.shape, -90);
            }

            if (collision.x) {
              console_log("collided x");
              this.x = this.last_x;
            } else if (collision.y) {
              console_log("collided y");
              this.y = this.last_y;
              if (this.shape.state === "falling") {
                this.shape.halt();
              }
            } else {
              console.log("unknown block collision type happening!");
            }

            this.shape.move(this.x, this.y);
          } else if (this.shape.state === "sliding") {
            this.shape.reset_to_falling();
          }
        }

        entity_manager.move_entity(this, this.x, this.y);
        manager.get('camera').center(-40, -40);
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
      "init": function (manager) {
        manager.get('ui').add_button({
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
      "deinit": function (manager) {
        manager.get('ui').remove_button("start_game");
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
    "setup": {
      "width": 360,
      "height": 616,
      "id": "setup",
      "player_layer": 2,
      "init": function (manager) {
        let entity_manager = manager.get('entity');

        entity_manager.add_text({
          id: "length_text",
          text: "game length:",
          x: 60,
          y: 304-50,
          offset_type: "fixed",
          font: "1em sans bold",
          color: "white",
          update: function (delta, manager) {},
        });

        manager.get('ui').add_button({
          id: "length_fast",
          x: 95,
          y: 290-50,
          width: 240,
          height: 20,
          text: 'fast:&nbsp;&nbsp;&nbsp;2&nbsp;rows / level',
          style: 'color: white; font-size: 1em; text-align: right',
          state: "deselected",
          on_state_change: function (manager, state) {
            let change_text = manager.get('ui').set_button_text;

            if (state === "selected") {
              change_text(this.id, '> fast:&nbsp;&nbsp;&nbsp;2 rows / level <');
            } else if (state === "deselected") {
              change_text(this.id, 'fast:&nbsp;&nbsp;&nbsp;2 rows / level');
            }
          },
        });
        manager.get('ui').add_button({
          id: "length_standard",
          x: 95,
          y: 310-50,
          width: 240,
          height: 20,
          text: 'standard:&nbsp;&nbsp;&nbsp;10 / level',
          style: 'color: white; font-size: 1em; text-align: right',
          state: "selected",
          on_state_change: function (manager, state) {
            let change_text = manager.get('ui').set_button_text;

            if (state === "selected") {
              change_text(this.id, '> standard:&nbsp;&nbsp;&nbsp;10 / level <');
            } else if (state === "deselected") {
              change_text(this.id, 'standard:&nbsp;&nbsp;&nbsp;10 / level');
            }
          },
        });
        manager.get('ui').add_button({
          id: "length_long",
          x: 95,
          y: 330-50,
          width: 240,
          height: 20,
          text: 'long:&nbsp;&nbsp;&nbsp;20 / level',
          style: 'color: white; font-size: 1em; text-align: right',
          state: "deselected",
          on_state_change: function (manager, state) {
            let change_text = manager.get('ui').set_button_text;

            if (state === "selected") {
              change_text(this.id, '> long:&nbsp;&nbsp;&nbsp;20 / level <');
            } else if (state === "deselected") {
              change_text(this.id, 'long:&nbsp;&nbsp;&nbsp;20 / level');
            }
          },
        });
        manager.get('ui').add_button({
          id: "length_epic",
          x: 95,
          y: 350-50,
          width: 240,
          height: 20,
          text: 'epic:&nbsp;&nbsp;&nbsp;30 / level',
          style: 'color: white; font-size: 1em; text-align: right',
          state: "deselected",
          on_state_change: function (manager, state) {
            let change_text = manager.get('ui').set_button_text;

            if (state === "selected") {
              change_text(this.id, '> epic:&nbsp;&nbsp;&nbsp;30 / level <');
            } else if (state === "deselected") {
              change_text(this.id, 'epic:&nbsp;&nbsp;&nbsp;30 / level');
            }
          },
        });
        manager.get('ui').add_button({
          id: "length_marathon",
          x: 95,
          y: 370-50,
          width: 240,
          height: 20,
          text: 'marathon:&nbsp;&nbsp;&nbsp;50 / level',
          style: 'color: white; font-size: 1em; text-align: right',
          state: "deselected",
          on_state_change: function (manager, state) {
            let change_text = manager.get('ui').set_button_text;

            if (state === "selected") {
              change_text(this.id, '> marathon:&nbsp;&nbsp;&nbsp;50 / level <');
            } else if (state === "deselected") {
              change_text(this.id, 'marathon:&nbsp;&nbsp;&nbsp;50 / level');
            }
          },
        });
        manager.get('ui').add_button({
          id: "length_methuselah",
          x: 95,
          y: 390-50,
          width: 240,
          height: 20,
          text: 'methuselah:&nbsp;&nbsp;&nbsp;100 / level',
          style: 'color: white; font-size: 1em; text-align: right',
          state: "deselected",
          on_state_change: function (manager, state) {
            let change_text = manager.get('ui').set_button_text;

            if (state === "selected") {
              change_text(this.id, '> methuselah:&nbsp;&nbsp;&nbsp;100 / level <');
            } else if (state === "deselected") {
              change_text(this.id, 'methuselah:&nbsp;&nbsp;&nbsp;100 / level');
            }
          },
        });

        entity_manager.add_text({
          id: "mode_text",
          text: "game type:",
          x: 60,
          y: 444-50,
          offset_type: "fixed",
          font: "1em sans bold",
          color: "white",
          update: function (delta, manager) {},
        });

        manager.get('ui').add_button({
          id: "mode_progression",
          x: 95,
          y: 430-50,
          width: 240,
          height: 20,
          text: 'progression',
          style: 'color: white; font-size: 1em; text-align: right',
          state: "selected",
          on_state_change: function (manager, state) {
            let change_text = manager.get('ui').set_button_text;

            if (state === "selected") {
              change_text(this.id, '> progressive levels <');
            } else if (state === "deselected") {
              change_text(this.id, 'progressive levels');
            }
          },
        });
        manager.get('ui').add_button({
          id: "mode_static",
          x: 95,
          y: 450-50,
          width: 240,
          height: 20,
          text: 'static level',
          style: 'color: white; font-size: 1em; text-align: right',
          state: "deselected",
          on_state_change: function (manager, state) {
            let change_text = manager.get('ui').set_button_text;

            if (state === "selected") {
              change_text(this.id, '> static level <');
            } else if (state === "deselected") {
              change_text(this.id, 'static level');
            }
          },
        });
        manager.get('ui').add_button({
          id: "mode_random",
          x: 95,
          y: 470-50,
          width: 240,
          height: 20,
          text: 'random levels',
          style: 'color: white; font-size: 1em; text-align: right',
          state: "deselected",
          on_state_change: function (manager, state) {
            let change_text = manager.get('ui').set_button_text;

            if (state === "selected") {
              change_text(this.id, '> random levels <');
            } else if (state === "deselected") {
              change_text(this.id, 'random levels');
            }
          },
        });

        entity_manager.add_text({
          id: "mute_text",
          text: "sound controls:",
          x: 60,
          y: 524-50,
          offset_type: "fixed",
          font: "1em sans bold",
          color: "white",
          update: function (delta, manager) {},
        });

        manager.get('ui').add_button({
          id: "mute_all",
          x: 95,
          y: 510-50,
          width: 240,
          height: 20,
          text: 'sound: off',
          style: 'color: white; font-size: 1em; text-align: right',
          state: "selected",
          on_state_change: function (manager, state) {
            let change_text = manager.get('ui').set_button_text;

            if (state === "selected") {
              change_text(this.id, '> sound: off <');
            } else if (state === "deselected") {
              change_text(this.id, 'sound: off');
            }
          },
        });
        manager.get('ui').add_button({
          id: "unmute_all",
          x: 95,
          y: 530-50,
          width: 240,
          height: 20,
          text: 'sound: on',
          style: 'color: white; font-size: 1em; text-align: right',
          state: "deselected",
          on_state_change: function (manager, state) {
            let change_text = manager.get('ui').set_button_text;

            if (state === "selected") {
              change_text(this.id, '> sound: on <');
            } else if (state === "deselected") {
              change_text(this.id, 'sound: on');
            }
          },
        });

        manager.get('ui').add_button({
          id: "start_game",
          x: 50,
          y: 565-33,
          width: 240,
          height: 20,
          text: '',
          style: 'color: white; font-size: 1.4em; text-align: center'
        });
        console.log("map " + this.id + ": initialized");
      },
      "deinit": function (manager) {
        manager.get('ui').remove_button("length_fast");
        manager.get('ui').remove_button("length_standard");
        manager.get('ui').remove_button("length_long");
        manager.get('ui').remove_button("length_epic");
        manager.get('ui').remove_button("length_marathon");
        manager.get('ui').remove_button("length_methuselah");
        manager.get('ui').remove_button("mode_progression");
        manager.get('ui').remove_button("mode_static");
        manager.get('ui').remove_button("mode_random");
        manager.get('ui').remove_button("mute_all");
        manager.get('ui').remove_button("unmute_all");
        manager.get('ui').remove_button("start_game");
        manager.get('entity').remove_text("length_text");
        manager.get('entity').remove_text("mode_text");
        manager.get('entity').remove_text("mute_text");
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
            y: 110,
            x_size: 320,
            y_size: 94,
            x_scale: 1,
            y_scale: 1,
            img: "logo",
            id: "logo",
            layer: 1,
          },
          {
            x: 144,
            y: 532,
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
      "init": function (manager) {
        let entity_manager = manager.get('entity');
        entity_manager.add_text({
          id: "level",
          text: "level: --",
          x: 384,
          y: 256,
          offset_type: "fixed",
          font: "16px sans bold",
          color: "white",
          update: function (delta, manager) {
            let player = manager.get('player').get_player();
            let level_text = "" + player.level;

            if (level_text.length === 1) {
              level_text = "0" + level_text;
            }
            this.text = "level: " + level_text;
          }
        });
        entity_manager.add_text({
          id: "score",
          text: "score:",
          x: 384,
          y: 276,
          offset_type: "fixed",
          font: "16px sans bold",
          color: "white",
          update: function (delta, manager) {
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
          y: 296,
          offset_type: "fixed",
          font: "16px sans bold",
          color: "white",
          update: function (delta, manager) {
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
          y: 316,
          offset_type: "fixed",
          font: "16px sans bold",
          color: "white",
          update: function (delta, manager) {
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
          y: 336,
          offset_type: "fixed",
          font: "16px sans bold",
          color: "white",
          update: function (delta, manager) {
            if (rows_cleared >= high_rows) {
              this.color = "red";
            } else {
              this.color = "white";
            }
            this.text = "hi rows: " + high_rows;
          }
        });
      },
      "deinit": function (manager) {
        let entity_manager = manager.get('entity');
        entity_manager.remove_text("level");
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
            "id": "score_box",
            "img": "background_black",
            "x": 376,
            "y": 232,
            "x_scale": 5,
            "y_scale": 116/32,
            "x_size": 160,
            "y_size": 116,
            "layer": -0.5,
          },
          {
            "id": "bound_left",
            "img": "nonexistent",
            "x": 0,
            "y": 0,
            "x_scale": 1,
            "y_scale": 1,
            "x_size": 39,
            "y_size": 1000,
            "layer": -0.5,
            "type": "bound",
          },
          {
            "id": "bound_right",
            "img": "nonexistent",
            "x": 361,
            "y": 0,
            "x_scale": 1,
            "y_scale": 1,
            "x_size": 40,
            "y_size": 1000,
            "layer": -0.5,
            "type": "bound",
          },
          {
            "id": "bound_bottom",
            "img": "nonexistent",
            "x": 0,
            "y": 617,
            "x_scale": 1,
            "y_scale": 1,
            "x_size": 400,
            "y_size": 40,
            "layer": -0.5,
            "type": "bound",
          },
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
      "url": "resources/sounds/2_rows.mp3",
      "id": "2_rows",
      "muted": false,
      "volume": 0.5,
      "looping": false,
    },
    {
      "type": "sound",
      "url": "resources/sounds/4_rows.mp3",
      "id": "4_rows",
      "muted": false,
      "volume": 0.5,
      "looping": false,
    },
    {
      "type": "sound",
      "url": "resources/sounds/level_up.mp3",
      "id": "level_up",
      "muted": false,
      "volume": 0.2,
      "looping": false,
    },
    {
      "type": "sound",
      "url": "resources/sounds/game_over.mp3",
      "id": "game_over",
      "muted": false,
      "volume": 0.8,
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
      "type": "sound",
      "url": "resources/sounds/game_start.mp3",
      "id": "game_start",
      "muted": false,
      "volume": 0.3,
      "looping": false,
    },
    {
      "type": "sound",
      "url": "resources/sounds/block_slide.mp3",
      "id": "block_slide",
      "muted": false,
      "volume": 0.15,
      "looping": false,
    },
    {
      "type": "sound",
      "url": "resources/sounds/block_rotate.mp3",
      "id": "block_rotate",
      "muted": false,
      "volume": 0.15,
      "looping": false,
    },
    {
      "type": "sound",
      "url": "resources/sounds/menu_beep.mp3",
      "id": "menu_beep",
      "muted": false,
      "volume": 0.25,
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
    {
      "type": "image",
      "url": "resources/images/mask_1.png",
      "id": "mask_1",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/mask_2.png",
      "id": "mask_2",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
    {
      "type": "image",
      "url": "resources/images/mask_3.png",
      "id": "mask_3",
      "source_x": 0,
      "source_y": 0,
      "source_width": 32,
      "source_height": 32,
    },
  ],          // resources array
};            // config object
