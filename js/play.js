    function deg_to_rad(degrees) {
        return (Math.PI * degrees) / 180;
    }

    function rotate_coordinates(x, y, angle) {
        let rads = deg_to_rad(angle);
        
        new_x = Math.round(Math.cos(rads)*x - Math.sin(rads)*y);
        new_y = Math.round(Math.sin(rads)*x + Math.cos(rads)*y);

        return {
            x: new_x,
            y: new_y,
        };
    }
    
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

    function draw_shape(shape) {
        let box = null;

        context.fillStyle = shape.color;
        for (i in shape.pieces) {
            draw_box(shape.x+box.rel_x, shape.y+box.rel_y);
        }
    }

    function draw_box(x, y) {
      let grid_size = 20;
      let x_offset = 20;
      let y_offset = 20;

      context.fillRect(
          x_offset + x * grid_size,
          y_offset + y * grid_size,
          grid_size,
          grid_size
      );
    }

    let a_shape = {
        x: 100,
        y: 40,
        color: "blue",
        pieces: [
            {
                rel_x: 0,
                rel_y: 0,
            },
            {
                rel_x: 1,
                rel_y: 0,
            },
            {
                rel_x: 2,
                rel_y: 0,
            },
            {
                rel_x: 2,
                rel_y: 1,
            },
        ]
    };

    function update() {
        a_shape.y += 20;

        if (a_shape.y % 50) {
          rotate_shape(a_shape, 90);
        }

        draw_shape(a_shape);

        if (a_shape.y < 500) {
            setTimeout(update, 500);
        }
    }
