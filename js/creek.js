"use strict";
let GameManager = (function () {
  let manager = null,
    get_scripts = function () {
      return manager.get('script').get_scripts();
    },
    init = function () {
      console.log("GameManager init.");
      let config_manager = ConfigManager();

      manager = Manager();

      manager.init({
        audio: AudioManager(),
        camera: CameraManager(),
        config: config_manager,
        context: ContextManager(),
        control: ControlManager(),
        cookie: CookieManager(),
        entity: EntityManager(),
        game_state: config_manager.get_game_state(),
        map: MapManager(),
        physics: PhysicsManager(),
        player: PlayerManager(),
        render: RenderManager(),
        request: RequestManager(),
        resource: ResourceManager(),
        script: ScriptManager(),
        ui: UIManager(),
      });

      manager.get('audio').load_clips(manager.get('resource').get_resources()['sound']);
      manager.get('render').next_frame();
    };

  return function () {
    return {
      init: init,
      get_scripts: get_scripts
    };
  };
})();


let Manager = (function () {
  let managers = null;

  let get = function (id) {
    let manager = managers[id];
    if (manager === undefined) {
      console.log("Requested a manager that doesn't exist: '" + id + "'");
      return undefined;
    }
    if (!manager.initialized) {
      manager.initialized = true;
      manager.manager.init(this);
    }
    return manager.manager;
  };

  let is_initialized = function (id) {
    let manager = managers[id];
    if (manager === undefined) {
      console.log("Requested a manager that doesn't exist: '" + id + "'");
      return undefined;
    }
    return manager.initialized;
  };

  let init = function (_managers) {
    console.log("Manager manager init.");
    let manager = null,
      i = null;

    managers = {};

    for (i in _managers) {
      managers[i] = {
        initialized: false,
        manager: _managers[i],
      };
    }
  };

  return function () {
    return {
      get: get,
      is_initialized: is_initialized,
      init: init
    };
  };
})();


let ConfigManager = (function () {
  let manager = null,
    config = null,
    load = function (config_spec) {
      config = JSON.parse(config_spec);
      return config;
    },
    get = function (id) {
      if (id) {
        return config[id];
      } else {
        return config;
      }
    },
    set = function (k, v) {
      config[k] = v;
      return config;
    },
    get_player = function () {
      return config.player;
    },
    get_maps = function () {
      let map = null,
        id = null,
        script = null,
        loading = [],
        defined = { ... config.maps },
        i = null,
        script_manager = manager.get('script');

      if (defined.to_load) {
        for (i in defined.to_load) {
          map = defined.to_load[i];
          script = script_manager.load_script(map, "resources/maps/");
          loading.push(script.id);
        }
        delete defined.to_load;
      }

      return {defined: defined, loading: loading};
    },
    get_resources = function () {
      return config.resources;
    },
    get_game_state = function () {
      let state = {
        init: function () {},
        update: function () {},
        post_resource_load: function () {},
      };

      if (config.game) {
        state.init = config.game.init || state.init;
        state.update = config.game.update || state.update;
        state.post_resource_load = config.game.post_resource_load || state.post_resource_load;
      }

      return state;
    },
    init = function (_manager) {
      console.log("ConfigManager init.");
      manager = _manager;
    };

  config = config_spec;

  return function () {
    return {
      init: init,
      get_config: get,
      get: get,
      set_config: set,
      get_player: get_player,
      get_maps: get_maps,
      get_game_state: get_game_state,
      get_resources: get_resources,
    };
  };
})();


let ScriptManager = (function () {
  let manager = null,
    scripts = {},
    default_path = null,
    new_script = function (id, path) {
      let script = null;
      path = path || default_path;

      if (scripts[id]) {
        console.log("attempted to overwrite script " + id);
        return;
      }

      script = {
        id: id,
        url: path + id + ".js",
        element: null,
        loaded: null,
        status: null,
      };

      scripts[id] = script;
      return script;
    },
    load_script = function (id, path) {
      let script = new_script(id, path);

      if (script.element) {
        console.log("attempted to overwrite script " + id + "'s element");
        return;
      }

      script.element = document.createElement("script");
      script.element.setAttribute('type', 'text/javascript');
      script.element.setAttribute('async', true);
      script.element.setAttribute('id', script.id);
      script.element.onload = function () {
        script.status = "success";
        script.loaded = true;
      };
      script.element.onerror = function () {
        console.log("error loading " + script.id + " script!");
        script.status = "error";
        script.loaded = false;
      }

      script.status = "loading";
      script.element.setAttribute('src', script.url);

      document.body.appendChild(script.element);
      return script;
    },
    load_scripts = function (script_ids, path) {
      let i = null;

      for (i in script_ids) {
        load_script(script_ids[i], path);
      }
    },
    get_script = function (id) {
      return scripts[id];
    },
    get_scripts = function () {
      return scripts;
    },
    all_loaded = function () {
      let i = null;

      for (i in scripts) {
        if (scripts[i].loaded !== true) {
          return false;
        }
      }

      return true;
    },
    errors = function () {
      let i = null,
        errors = [];

      for (i in scripts) {
        if (scripts[i].status === "error") {
          errors.push(scripts[i].id);
        }
      }

      return errors;
    },
    init = function (_manager) {
      let config_path = null;
      console.log("ScriptManager init.");

      manager = _manager;
      config_path = manager.get('config').get('script_path');
      default_path = config_path || "/resources/scripts/";
    };

  return function () {
    return {
      init: init,
      load_script: load_script,
      load_scripts: load_scripts,
      get_script: get_script,
      get_scripts: get_scripts,
      all_loaded: all_loaded,
      errors: errors
    };
  };
})();


let RequestManager = (function () {
  let manager = null,
    data = null,
    _method = null,
    state = null,
    url = null,
    requests = null,
    debug = null,
    get_data = function (id) {
      if (requests[id]) {
        return requests[id].data;
      }
    },
    get_request = function (id) {
      return requests[id];
    },
    remove = function (id) {
      if (requests[id]) {
        delete requests[id];
      }
    },
    get = function (url, id, options) {
      let body = null;
      if (options && options.body) {
        body = options.body;
      }
      return send('get', url, body, id, options);
    },
    post = function (url, body, id, options) {
      return send('post', url, body, id, options);
    },
    put = function (url, body, id, options) {
      return send('put', url, body, id, options);
    },
    _delete = function (url, id, options) {
      return send('delete', url, null, id, options);
    },
    options = function (url, id, options) {
      return send('options', url, null, id, options);
    },
    head = function (url, id, options) {
      return send('head', url, null, id, options);
    },
    send = function (method, url, body, id, options) {
      let _debug = debug;
      if (options && (options.debug === false || options.debug)) {
        _debug = options.debug;
      }

      if (!id) {
        id = timestamp_id();
        console.log("creating an id in " + method + " request for " + url);
      }

      if (requests[id]) {
        delete requests[id];
        console.log("overwriting id " + id + " in " + method + " request for " + url);
      }

      let new_request = {
        xhr: new XMLHttpRequest(),
        id: id,
        method: method,
        url: url,
        body: body,
        options: options,
        data: null,
        state: "initialized",
        initialized_at: performance.now(),
        resolved_at: null,
      };

      requests[id] = new_request;
      new_request.xhr.onload = function (e) {
        if (_debug) {
          console.log("request " + id + " text: " + this.responseText);
        }
        new_request.data = JSON.parse(this.responseText);
        new_request.state = "complete";
        new_request.resolved_at = performance.now();
      };
      new_request.xhr.open(method, url);
      new_request.xhr.send();

      return id;
    },
    init = function (_manager) {
      console.log("RequestManager init.");
      manager = _manager;
      debug = manager.get('config')['request_debug'];
      requests = {};
    };

  return function () {
    return {
      init: init,
      get_data: get_data,
      get_request: get_request,
      get: get,
      post: post,
      put: put,
      'delete': _delete,
      send: send,
      options: options,
      head: head,
    };
  }
})();



let ContextManager = (function () {
  let manager = null,
    context = null,
    canvas = null,
    fullscreen = false,
    width = 0,
    height = 0,
    canvas_id = "",
    stage_id = "",
    get_context = function () {
      return context;
    },
    get_canvas = function () {
      return canvas;
    },
    get_width = function () {
      return width;
    },
    get_height = function () {
      return height;
    },
    set_context = function (new_context) {
      context = new_context;
      return context;
    },
    set_canvas = function (new_canvas) {
      canvas = new_canvas;
      context = canvas.getContext("2d");
      return canvas;
    },
    resize = function (event, x_size, y_size) {
      width = x_size || max_width();
      height = y_size || max_height();
      canvas.width = width;
      canvas.height = height;
      set_canvas(canvas);
    },
    make_fullscreen = function () {
      window.addEventListener("resize", resize);
    },
    stop_fullscreen = function () {
      window.removeEventListener("resize", resize);
      resize(null, width, height);
    },
    max_height = function () {
      return document.body.clientHeight;
    },
    max_width = function () {
      return document.body.clientWidth;
    },
    init = function (_manager) {
      console.log("ContextManager init.");
      manager = _manager;
      let config = manager.get('config').get_config();
      let stage = null;

      canvas_id = config.canvas_id || "canvas";
      stage_id = config.stage_id || "stage";
      width = config.width || max_width();
      height = config.height || max_height();
      fullscreen = config.fullscreen || false;

      stage = document.getElementById("stage");
      canvas = document.createElement("canvas");

      document.body.style.overflow = "hidden";
      stage.style.overflow = "hidden";
      canvas.style.overflow = "hidden";
      canvas.id = canvas_id;
      canvas.style.display = "block";

      stage.appendChild(canvas);
      resize(null, width, height);
      if (fullscreen === true) {
        make_fullscreen();
      }

      set_canvas(canvas);
    };

  return function () {
    return {
      init: init,
      get_context: get_context,
      get_canvas: get_canvas,
      set_context: set_context,
      set_canvas: set_canvas,
      get_width: get_width,
      get_height: get_height,
      resize: resize,
    };
  };
})();


let CookieManager = (function () {
  let manager = null,
    cookies = null,
    last_cookies = null,
    set_cookies = function (cookie_dict) {
      let cookie = null, value = null, output = null, key = null;

      for (key in cookie_dict) {
        cookie = cookie_dict[key];
        value = cookie.value;
        output = key + "=" + value;
        if (cookie.path) {
          output += ";path=" + cookie.path;
        }
        if (cookie.max_age) {
          output += ";max-age=" + cookie.max_age;
        }
        if (cookie.expires) {
          output += ";expires=" + cookie.expires;
        }
        if (cookie.domain) {
          output += ";domain=" + cookie.domain;
        }
        if (cookie.secure) {
          output += ";secure";
        }

        document.cookie = output;
      }
      load_cookies();
    },
    load_cookies = function () {
      let cookie_pairs = document.cookie.split("; "),
        cookie_pair = null,
        index = null;

      last_cookies = cookies;
      cookies = {};

      for (index in cookie_pairs) {
        cookie_pair = cookie_pairs[index].split("=");
        cookies[cookie_pair[0]] = cookie_pair[1];
      }

      return cookies;
    },
    get_cookies = function () {
      return cookies;
    },
    init = function (_manager) {
      console.log("CookieManager init.");
      manager = _manager;
      cookies = load_cookies();
    };

  return function () {
    return {
      init: init,
      get_cookies: get_cookies,
      set_cookies: set_cookies
    };
  };
})();


let CameraManager = (function () {
  let manager = null,
    camera = null,
    map_manager = null,
    context_manager = null,
    fullscreen = null,
    get_camera = function () {
      return camera;
    },
    get_offset = function () {
      return {
        x: camera.x,
        y: camera.y,
      };
    },
    center = function (center_x, center_y) {
      let new_camera_x = camera.x,
        new_camera_y = camera.y;

      if (center_x > camera.inner_x + camera.inner_width) {
        new_camera_x += (center_x - (camera.inner_x + camera.inner_width));
      } else if (center_x < camera.inner_x) {
        new_camera_x += (center_x - camera.inner_x);
      }

      if (center_y > camera.inner_y + camera.inner_height) {
        new_camera_y += (center_y - (camera.inner_y + camera.inner_height));
      } else if (center_y < camera.inner_y) {
        new_camera_y += (center_y - camera.inner_y);
      }

      move(new_camera_x, new_camera_y);
    },
    move = function (x, y) {
      if (fullscreen && camera.width !== context_manager.get_width()) {
        resize(context_manager.get_width(), context_manager.get_height());
      }

      let bounds = manager.get('map').get_bounds();

      x = clamp(x, bounds.x, bounds.width-camera.width);
      y = clamp(y, bounds.y, bounds.height-camera.height);

      camera.x = x;
      camera.y = y;
      camera.inner_x = camera.x + camera.width / 4;
      camera.inner_y = camera.y + camera.height / 4;
    },
    resize = function (width, height) {
      camera.width = width;
      camera.height = height;
      camera.inner_width = width / 2;
      camera.inner_height = height / 2;
    },
    init = function (_manager) {
      console.log("CameraManager init.");
      manager = _manager;

      let config = manager.get('config').get_config(),
        camera_config = config.camera,
        width = camera_config.width,
        height = camera_config.height;

      fullscreen = config.fullscreen || false;

      context_manager = manager.get('context');

      if (fullscreen) {
        width = context_manager.get_width();
        height = context_manager.get_height();
      }

      camera = {
        inner_x: camera_config.x-width/4,
        inner_y: camera_config.y-height/4,
        inner_width: width / 2,
        inner_height: height / 2,
        x: camera_config.x,
        y: camera_config.y,
        width: width,
        height: height,
        top_margin: camera_config.top_margin,
        bottom_margin: camera_config.bottom_margin,
        left_margin: camera_config.left_margin,
        right_margin: camera_config.right_margin,
      };
    };

  return function () {
    return {
      init: init,
      get_camera: get_camera,
      get_offset: get_offset,
      move: move,
      resize: resize,
      center: center,
    };
  }
})();



let ResourceManager = (function () {
  let manager = null,
    image_base_url = null,
    resources = {
      'image': {},
      'sound': {},
    },
    get_resources = function () {
      return resources;
    },
    get_image = function (name) {
      return resources['image'][name];
    },
    get_sound = function (name) {
      return resources['sound'][name];
    },
    load_image = function (resource) {
      let img = new Image();
      let promise = new Promise(
        function(resolve, reject) {
          img.addEventListener("load", function () {
            console.log("image " + resource.url + " loaded.");
            resolve({
              "type": resource.type,
              "id": resource.id,
              "url": resource.url,
              "img": img,
              "source_x": resource.source_x,
              "source_y": resource.source_y,
              "source_width": resource.source_width,
              "source_height": resource.source_height,
            });
          }, false);
          img.addEventListener("error", function () {
            console.log("image " + resource.url + " failed to load.");
            reject();
          }, false);
        }
      );
      img.src = resource.url;
      return promise;
    },
    load_sound = function (resource) {
      let sound = document.createElement("audio");
      let promise = new Promise(
        function (resolve, reject) {
          sound.addEventListener("loadstart", function () {
            console.log("sound " + resource.url + " began loading.");
            resolve({
              type: resource.type,
              id: resource.id,
              url: resource.url,
              element: sound,
            });
          }, false);
          sound.addEventListener("error", function () {
            console.log("sound " + resource.url + " failed to load.");
            reject();
          }, false);
        }
      );
      sound.preload = "none";
      sound.loop = resource.looping;
      sound.muted = resource.muted;
      sound.volume = resource.volume;
      sound.src = resource.url;
      return promise;
    },
    add_image = function (image) {
      if (!image || !image.id || !image.img) {
        console.log("no image or image without id/img in add_image");
        console.log("image was:");
        console.log(image);
        return;
      }
      if (resources['image'][image.id]) {
        console.log("overwriting image " + image.id + " in add_image.");
      }
      resources['image'][image.id] = image;
    },
    init = function (_manager) {
      console.log("ResourceManager init.");
      manager = _manager;
      let parsed_resources = manager.get('config').get_resources(),
        resource_promise = null,
        resource = null,
        promises = [],
        i = null;

      for (i in parsed_resources) {
        resource = parsed_resources[i];

        if (resource.type === 'image') {
          resource_promise = load_image(resource);
          promises.push(resource_promise);
        } else if (resource.type === 'sound') {
          resource_promise = load_sound(resource);
          promises.push(resource_promise);
        } else {
          console.log("tried to load unknown resource type: " + resource.type);
        }
      }

      Promise.all(promises).then(
        function (loaded) {
          let resource = null,
            resource_index = null;

          for (resource_index in loaded) {
            resource = loaded[resource_index];
            resources[resource.type][resource.id] = resource;
          }
          console.log("resources after load are:");
          console.log(resources);
          post_resource_load();
        }, function () {
          console.log("trouble loading resources.");
        }
      );
    },
    post_resource_load = function () {
      manager.get('game_state').post_resource_load(manager);
    };

  return function () {
    return {
      init: init,
      get_resources: get_resources,
      get_image: get_image,
      get_sound: get_sound,
      add_image: add_image,
    };
  };
})();



let ControlManager = (function () {
  let manager = null,
    controls = {
      buttons: {},
      mouse: {
        dragging_at: 0,
        down_at: 0,
      },
    },
    keys = function (id) {
      return controls[id] && controls[id].down;
    },
    buttons = function (id) {
      return controls.buttons[id] && controls.buttons[id].down;
    },
    mouse = function () {
      return controls.mouse.down;
    },
    mouse_coords = function () {
      return {
        x: controls.mouse.x,
        y: controls.mouse.y
      };
    },
    get_controls = function () {
      return controls;
    },
    add_button = function (button) {
      controls.buttons[button.id] = button;
    },
    remove_button = function (id) {
      let button = controls.buttons[id];

      if (button) {
        delete controls.buttons[id];
      }
    },
    set_button = function (id, key, value) {
      let button = controls.buttons[id];
      if (button) {
        button.key = value;
        if (key === 'hover') {
          if (value === true) {
            button.hover = true;
            button.hover_at = performance.now();
          } else {
            button.hover = false;
            button.hovered_at = performance.now();
          }
        } else if (key === 'down') {
          if (value === true) {
            button.down = true;
            button.down_at = performance.now();
          } else {
            button.down = false;
            button.up_at = performance.now();
          }
        }
      }
    },
    init = function (_manager) {
      console.log("ControlManager init.");
      manager = _manager;
      let _config = manager.get('config');
      document.addEventListener("keydown", function (e) {
        if (controls[e.code] === undefined) {
          controls[e.code] = {};
        }
        controls[e.code].event = e;
        controls[e.code].down = true;
        controls[e.code].down_at = performance.now();
      });

      document.addEventListener("keyup", function (e) {
        if (controls[e.code] !== undefined) {
          delete controls[e.code].event;
          controls[e.code].down = false;
          controls[e.code].up_at = performance.now();
        }
      });

      window.addEventListener("mousedown", function (e) {
        controls.mouse.down_event = e;
        controls.mouse.x = e.x;
        controls.mouse.y = e.y;
        controls.mouse.down = true;
        controls.mouse.down_at = performance.now();
      });

      window.addEventListener("mouseup", function (e) {
        delete controls.mouse.down_event;
        controls.mouse.down = false;
        controls.mouse.up_at = performance.now();
        // only set dragging to false if it was true
        if (controls.mouse.dragging === true) {
          controls.mouse.dragging = false;
          controls.mouse.dragged_at = performance.now();
        }
      });

      window.addEventListener("mousemove", function (e) {
        controls.mouse.move_event = e;
        controls.mouse.x = e.x;
        controls.mouse.y = e.y;
        if (controls.mouse.down === true && controls.mouse.dragging !== true) {
          controls.mouse.dragging = true;
          controls.mouse.dragging_at = performance.now();
        }
      });
    };

  return function () {
    return {
      init: init,
      get_controls: get_controls,
      add_button: add_button,
      remove_button: remove_button,
      set_button: set_button,
      keys: keys,
      buttons: buttons,
      mouse: mouse,
      mouse_coords: mouse_coords,
    };
  };
})();



let UIManager = (function () {
  let manager = null,
    buttons = null,
    control_manager = null,
    add_button = function (button) {
      /* button should be like: {
       *   id: a unique id to refer to this button
       *   x: x-coord from left
       *   y: y-coord from top
       *   width: button-width
       *   height: button-height
       *   text: text for the button to display
       *
       *   background: (optional) background for button
       *   style: (optional) custom-style
       *   update: (optional) update-function taking manager manager
       * }
       */

      let element = document.createElement("div");
      let style_string = "position: absolute; display: inline-block; ";
      style_string += "left: " + button.x + "px; ";
      style_string += "top: " + button.y + "px; ";
      style_string += "width: " + button.width + "px; ";
      style_string += "height: " + button.height + "px; ";
      style_string += "background: " + button.background + "; ";
      if (button.style) {
        style_string += button.style;
      }
      element.style = style_string;
      element.innerHTML = button.text;
      element.id = button.id;
      button.element = element;

      button.hover = false;
      button.down = false;
      button.hover_at = 0;
      button.down_at = 0;

      button.on_enter = function () {
        control_manager.set_button(button.id, 'hover', true);
      };
      button.on_out = function () {
        control_manager.set_button(button.id, 'hover', false);
      };
      button.on_down = function () {
        control_manager.set_button(button.id, 'down', true);
      };
      button.on_up = function () {
        control_manager.set_button(button.id, 'down', false);
      };

      element.addEventListener('mouseenter', button.on_enter);
      element.addEventListener('mouseout', button.on_out);
      element.addEventListener('mousedown', button.on_down);
      element.addEventListener('mouseup', button.on_up);

      let stage = document.getElementById("stage");
      stage.appendChild(element);

      buttons[button.id] = button;
      control_manager.add_button(button);
    },
    remove_button = function (id) {
      let button = buttons[id];

      control_manager.remove_button(id);

      if (!button || !button.element) {
        return null;
      }

      let element = button.element;
      element.removeEventListener('mouseenter', button.on_enter);
      element.removeEventListener('mouseout', button.on_out);
      element.removeEventListener('mousedown', button.on_down);
      element.removeEventListener('mouseup', button.on_up);

      let stage = document.getElementById("stage");
      stage.removeChild(element);

      return button;
    },
    set_button_text = function (id, text) {
      let button = buttons[id];

      if (!button || !button.element) {
        return null;
      };

      button.element.innerHTML = text;
    },
    set_button_state = function (id, state) {
      let button = buttons[id];

      if (!button) {
        return null;
      }

      button.previous_state = button.state;
      button.state = state;

      if (button.on_state_change) {
        button.on_state_change(manager, state);
      }
    },
    get_buttons = function () {
      return buttons;
    },
    init = function (_manager) {
      console.log("UIManager init.");
      manager = _manager;
      buttons = {};
      control_manager = manager.get('control');
    };

  return function () {
    return {
      init: init,
      get_buttons: get_buttons,
      add_button: add_button,
      remove_button: remove_button,
      set_button_text: set_button_text,
      set_button_state: set_button_state,
    };
  };
})();



let MapManager = (function () {
  let manager = null,
    maps = null,
    loading = null,
    current_map_id = null,
    last_change_time = null,
    min_change_time = null,
    get_entities = function (map_id) {
      map_id = map_id || current_map_id;
      return maps[map_id].layers;
    },
    get_current_map_id = function () {
      return current_map_id;
    },
    get_map = function (map_id) {
      map_id = map_id || current_map_id;
      return maps[map_id];
    },
    get_maps = function () {
      return maps;
    },
    get_bounds = function () {
      let map = maps[current_map_id];
      return {
        x: 0,
        y: 0,
        width: map.width,
        height: map.height,
      };
    },
    change_maps = function (map_id) {
      let now = performance.now();

      // don't allow changes too frequently or if still loading
      if (maps[map_id].initialized || (is_loading(map_id) || (last_change_time && (now - last_change_time < min_change_time)))) {
        return false;
      }

      // teardown actions in old map (if any)
      if (maps[current_map_id].initialized && last_change_time !== null && maps[current_map_id].deinit) {
        maps[current_map_id].deinit(manager);
        maps[current_map_id].initialized = false;
      }

      // actually change the map
      current_map_id = map_id;
      manager.get('entity').setup_entities();

      // setup actions in new map (if any)
      if (maps[current_map_id].init) {
        maps[current_map_id].init(manager);
        maps[current_map_id].initialized = true;
      }

      last_change_time = now;
      return true;
    },
    get_quadtree = function (map, leaf_size) {
      let i = null, j = null;

      leaf_size = leaf_size || 25;
      map = map || maps[current_map_id];

      // iterate over map and produce quadtree
      let tree = build_quadtree(0, 0, map.width, map.height, leaf_size),
        entities = null;
      for (i in map.layers) {
        entities = map.layers[i];
        for (j in entities) {
          quadtree_insert(tree, entities[j]);
        }
      }

      return tree;
    },
    update = function (delta, manager) {
      if (maps[current_map_id].update) {
        maps[current_map_id].update(delta, manager);
      }
    },
    load_if_needed = function () {
      let to_remove = [],
        i = null,
        script_manager = manager.get('script'),
        map_manager = manager.get('map'),
        script = null;

      for (i in loading) {
        script = script_manager.get_script(loading[i]);

        if (!script) {
          script = script_manager.load_script(loading[i]);
        }

        if (script.loaded && script.data) {
          maps[script.data.map.id] = script.data.map;
          maps[script.data.map.id].loading = false;
          if (script.data.map.id == map_manager.get_current_map_id()) {
            map_manager.change_maps(script.data.map.id);
          }
          to_remove.push(i);
        }
      }

      for (i in to_remove) {
        loading.splice(to_remove[i], 1);
      }
    },
    is_loading = function (map_id) {
      map_id = map_id || current_map_id;
      return maps[current_map_id].loading;
    },
    init = function (_manager) {
      console.log("MapManager init.");
      manager = _manager;
      let config_manager = manager.get('config'),
        config = config_manager.get_config(),
        map_sets = config_manager.get_maps(),
        i = null;

      maps = map_sets.defined;
      loading = map_sets.loading;
      for (i in loading) {
        maps[loading[i]] = {
          id: loading[i],
          loading: true,
          layers: [],
        };
      }
      min_change_time = config['min_map_change_time'] || 150;
      current_map_id = config['initial_map_id'];
    };

  return function () {
    return {
      init: init,
      get_entities: get_entities,
      change_maps: change_maps,
      get_map: get_map,
      get_bounds: get_bounds,
      get_quadtree: get_quadtree,
      get_maps: get_maps,
      load_if_needed: load_if_needed,
      is_loading: is_loading,
      get_current_map_id: get_current_map_id,
      update: update,
    };
  };
})();



let PlayerManager = (function () {
  let manager = null,
    player = null,
    get_player = function () {
      return player;
    },
    modify_player = function (key, value) {
      player[key] = value;
    },
    update = function (delta, manager) {
      player.update(delta, manager);
    },
    init = function (_manager) {
      console.log("PlayerManager init.");
      manager = _manager;
      player = manager.get('config').get_player();
    };

  return function () {
    return {
      init: init,
      get_player: get_player,
      update: update,
      modify_player: modify_player,
    };
  };
})();



let PhysicsManager = (function () {
  let manager = null,
    physics = null,
    to_rect = function (entity) {
      return {
        'left': entity.x,
        'width': entity.x_size,
        'right': entity.x+entity.x_size,
        'top': entity.y,
        'bottom': entity.y+entity.y_size,
        'height': entity.y_size,
        'mid_x': entity.x + entity.x_size / 2,
        'mid_y': entity.y + entity.y_size / 2,
        'collide_distance': Math.max(entity.x_size / 2, entity.y_size / 2),
      };
    },
    distance = function (rect_one, rect_two, debug) {
      let x_distance = Math.abs(rect_one.mid_x - rect_two.mid_x),
        y_distance = Math.abs(rect_one.mid_y - rect_two.mid_y),
        hypotenuse = Math.sqrt(
          x_distance * x_distance + y_distance * y_distance
        );

        return hypotenuse;
    },
    aabb_collide = function (entity_one, entity_two, debug) {
      let a = to_rect(entity_one);
      let b = to_rect(entity_two);
      let d1x = a.left - b.right;
      let d1y = a.top - b.bottom;
      let d2x = b.left - a.right;
      let d2y = b.top - a.bottom;
      let ret = null;

      if (debug) {
        console.log("entity one, a: " + JSON.stringify(a));
        console.log("entity two, b: " + JSON.stringify(b));
        console.log("d1x, d2x, d1y, d2y: " + d1x + ", " + d2x + ", " + d1y + ", " + d2y);
      }

      if (d1x > 0 || d1y > 0 || d2x > 0 || d2y > 0) {
        ret = false;
      } else {
        ret = true;
      }

      if (debug) {
        console.log("aabb_collide returningLKJLJLKJ " + ret);
      }

      return ret;
    },
    collide = function (entity_one, entity_two, debug) {
      let rect_one = to_rect(entity_one),
        rect_two = to_rect(entity_two),
        rect_distance = distance(rect_one, rect_two, debug),
        collision = null;

      if (debug) {
        console.log("distance to collide: " + rect_one.collide_distance+rect_two.collide_distance);
        console.log("distance is " + rect_distance);
      }

      return (rect_distance <= rect_one.collide_distance+rect_two.collide_distance);
    },
    parallel_line_intersect = function (one_low, one_high, two_low, two_high) {
      /* I'm really reinventing the wheel here!
       *
       * For the purpose of these diagrams, lower absolute value
       * (not magnitude) is on the left, higher is on the right.
       *
       * e.g.:
       *
       *   low --------- high
       *
       * Return codes are as follows:
       *
       * "below": one does not intersect two, and is below it
       *
       *   |--one--|  |--two--|
       *
       * "above": one does not intersect two, and is above it
       *
       *   |--two--|  |--one--|
       *
       * "low": one intersects only the lower bound of two
       *
       *   |--one--|
       *       |--two--|
       *
       *   or
       *
       *   |--one--|
       *           |--two--|
       *
       *   or
       *
       *   |--one--|
       *   |---two---|
       *
       * "middle": one intersects two, but not either bound of two,
       *           one is "contained within" two
       *
       *    |--one--|
       *   |---two---|
       *
       *   or
       *
       * "equal": one and two are equivalent
       *
       *   |--one--|
       *   |--two--|
       *
       * "high": one intersects only the higher bound of two
       *
       *       |--one--|
       *   |--two--|
       *
       *   or
       *
       *   |--two--|
       *           |--one--|
       *
       *   or
       *
       *     |--one--|
       *   |---two---|
       *
       * "whole": one intersects both bounds of two,
       *          one "contains" two
       *
       *   |---one---|
       *    |--two--|
       *
       *   or
       *
       *   |---one---|
       *   |--two--|
       *
       *   or
       *
       *   |---one---|
       *     |--two--|
       *
       * error: NaN or undefined values, and/or
       *        low > high for one and/or
       *        low > high for two
       *
       */

      if (one_high < two_low) {
        return "below";
      }

      if (one_low > two_high) {
        return "above";
      }

      if (one_low === two_low && one_high === two_high) {
        return "equal";
      }


      if (one_low <= two_low && one_high < two_high && one_high > two_low) {
        // not assuming one_high >= two_low in case conditions order is shuffled
        return "low";
      }

      if (one_low > two_low && one_high < two_high) {
        return "middle";
      }

      if (one_low > two_low && one_high >= two_high && one_low < two_high) {
        // not assuming one_low <= two_high in case conditions order is shuffled
        return "high";
      }

      if (one_low <= two_low && one_high >= two_high && !(one_low === two_low && one_high === two_high)) {
        // not assuming one_low !(one_low === two_low && one_high === two_high)
        // in case conditions order is shuffled
        return "whole";
      }

      return "error";
    },
    directional_collide = function (one, two, options) {
      options = options || {};

      let x_intersect = parallel_line_intersect(
          one.x,
          one.x + one.x_size,
          two.x,
          two.x + two.x_size
        ),
        y_intersect = parallel_line_intersect(
          one.y,
          one.y + one.y_size,
          two.y,
          two.y + two.y_size
        ),
        _top = y_intersect === "low",
        bottom = y_intersect === "high",
        left = x_intersect === "low",
        right = x_intersect === "high",
        x_center = x_intersect === "middle" || x_intersect === "whole" || x_intersect === "equal",
        y_center = y_intersect === "middle" || y_intersect === "whole" || y_intersect === "equal",
        x_collision = left || right || x_center,
        y_collision = _top || bottom || y_center,
        happening = x_collision && y_collision;

      // by default, this returns null if no actual collision
      if (!(happening || options.return_non_collisions)) {
        return null;
      }

      return {
        'top': _top,
        bottom: bottom,
        left: left,
        right: right,
        x_center: x_center,
        y_center: y_center,
        center: x_center || y_center,
        x_collision: x_collision,
        y_collision: y_collision,
        happening: x_collision && y_collision,
      };
    },
    init = function (_manager) {
      manager = _manager;
      console.log("PhysicsManager init.");

      physics = {};
    };

  return function () {
    return {
      init: init,
      physics: physics,
      collide: aabb_collide,
      directional_collide: directional_collide,
    };
  };
})();



let EntityManager = (function () {
  let manager = null,
    entities = null,
    texts = null,
    player = null,
    camera_manager = null,
    maps = null,
    current_map_id = null,
    physics = null,
    tree = null,
    particle_count = 0,
    last_particle_added = null,
    game_state = null,
    last_loading = null,
    just_loaded = null,
    last_updated = null,
    get_entity = function (id) {
      let i = null;

      for (i in entities) {
        if (entities[i].id === id) {
          return entities[i];
        }
      }
    },
    load_if_needed = function () {
      maps.load_if_needed();
    },
    clear_entities = function () {
      console.log("clearing all entities yo");
    },
    get_entities = function (options) {
      options = options || {};
      let setup = options.setup;

      if (maps.is_loading()) {
        return entities;
      }

      if (!setup && last_updated && (performance.now() - last_updated < 50)) {
        return entities;
      }
      last_updated = performance.now();

      let camera = camera_manager.get_camera(),
        x = camera.x-camera.left_margin,
        y = camera.y-camera.top_margin,
        width = camera.width+camera.right_margin,
        height = camera.height+camera.bottom_margin;

      let et = quadtree_get_by_range(tree, x, y, x+width, y+height);
      let control_manager = manager.get('control');
      if (control_manager.keys('KeyP')) {
        debugger;
      }

      let background = null;
      if (manager.get('map').get_map().needs_bg) {
        background = quadtree_get_by_id(tree, "bg1");
        if (background) {
          et.push(background);
        }
      }

      return et.sort(
        function (a, b) {
          return a.layer - b.layer;
        }
      );
    },
    get_texts = function () {
      return texts;
    },
    setup_entities = function () {
      let current_map = maps.get_map(),
        layers = null,
        map_bg = null;

      if (maps.is_loading(current_map.id)) {
        return false;
      }

      layers = current_map.layers;
      map_bg = {
        "id": "bg1",
        "img": "bg",
        "x": 0,
        "y": 0,
        "x_scale": 12,
        "y_scale": 12,
        "x_size": current_map.width,
        "y_size": current_map.height,
        "layer": -99,
      };
      current_map_id = current_map.id;

      if (current_map.loading && !entities) {
        entities = [map_bg];
        tree = null;
        add_text({
          id: "loading",
          text: "loading",
          x: 10,
          y: 10,
          color: "black"
        });
        return;
      }

      if (just_loaded) {
        remove_text("loading");
        just_loaded = false;
      }

      if (current_map.needs_bg) {
        layers.unshift([map_bg]);
      }

      // paste the player layer into the correct spot and update player
      layers.splice(current_map.player_layer, 0, [player.get_player()]);
      player.modify_player('layer', current_map.player_layer);
      tree = maps.get_quadtree(current_map);
      layers.splice(current_map.player_layer, 1);
      entities = get_entities({setup: true});
    },
    move_entity = function (entity, x, y) {
      if (maps.is_loading()) {
        return;
      }
      quadtree_move(tree, entity, x, y);
    },
    add_entity = function (entity) {
      quadtree_insert(tree, entity);
    },
    remove_entity = function (id) {
      return quadtree_remove_by_id(tree, id);
    },
    add_text = function (text) {
      text.offset_type = text.offset_type || "camera";
      text.font = text.font || "16px sans";
      text.color = text.color || "black";
      texts.push(text);
    },
    remove_text = function (id) {
      let to_remove = -1,
        i = null;

      for (i in texts) {
        if (texts[i].id === id) {
          to_remove = i;
        }
      }

      if (to_remove !== -1) {
        texts.splice(to_remove, 1);
      }
    },
    collide = function (entity) {
      let collisions = [],
        target = null,
        i = null;

      for (i in entities) {
        target = entities[i];
        if (target.active !== false && entity.id !== target.id && physics.collide(entity, target)) {
          collisions.push(target);
        }
      }

      return collisions;
    },
    update = function (delta, manager) {
      let ei = null,
        ti = null;

      entities = get_entities();

      for (ei in entities) {
        if (entities[ei].update) {
          entities[ei].update(delta, manager);
        }
      }

      player.update(delta, manager);
      maps.update(delta, manager);
      game_state.update(delta, manager);

      for (ti in texts) {
        if (texts[ti].update) {
          texts[ti].update(delta, manager);
        }
      }
    },
    init = function (_manager) {
      console.log("EntityManager init.");
      manager = _manager;
      let tp = player = manager.get('player');
      texts = [];
      camera_manager = manager.get('camera');
      maps = manager.get('map');
      physics = manager.get('physics');
      console.log("setting up the ui manager");
      game_state = manager.get('game_state');
      last_particle_added = performance.now();
      maps.change_maps(maps.get_current_map_id());
      setup_entities();
    };

  return function () {
    console.log("instantiating the entity manager.");
    return {
      init: init,
      get_entities: get_entities,
      get_entity: get_entity,
      setup_entities: setup_entities,
      update: update,
      collide: collide,
      move_entity: move_entity,
      add_entity: add_entity,
      clear_entities: clear_entities,
      add_text: add_text,
      get_texts: get_texts,
      remove_text: remove_text,
      remove_entity: remove_entity,
      load_if_needed: load_if_needed,
    };
  };
})();



let AudioManager = (function () {
  let manager = null,
    clips = null,
    default_volume = null,
    resource_manager = null,
    currently_paused = null,
    all_muted = null;

  let get_clip = function (clip_id) {
      let sounds = null;
      if (clips === null) {
        sounds = resource_manager.get_resources()['sound'];
        if (!sounds || empty_dict(sounds)) {
          console.log("clips haven't loaded yet!");
          return null;
        } else {
          load_clips(sounds);
        }
      }
      if (!clips[clip_id]) {
        console.log("attempting to get clip: " + clip_id + " that wasn't found in clips");
      }
      return clips[clip_id];
    },
    play = function (clip_id) {
      let clip = get_clip(clip_id);
      clip.play();
    },
    pause = function (clip_id) {
      let clip = get_clip(clip_id);
      clip.pause();
    },
    stop = function (clip_id) {
      let clip = get_clip(clip_id);
      clip.stop();
    },
    volume = function (clip_id, level) {
      let clip = get_clip(clip_id);
      clip.volume(level);
    },
    set_time = function (clip_id, time) {
      let clip = get_clip(clip_id);
      clip.set_time(time);
    },
    mute = function (clip_id) {
      let clip = get_clip(clip_id);
      clip.mute();
    },
    unmute = function (clip_id) {
      let clip = get_clip(clip_id);
      clip.unmute();
    },
    loop = function (clip_id, looping_bool) {
      let clip = get_clip(clip_id);
      clip.loop(looping_bool);
    },
    playing = function (clip_id) {
      let clip = get_clip(clip_id);
      return clip.playing();
    },
    paused = function (clip_id) {
      let clip = get_clip(clip_id);
      return clip.paused();
    },
    get_volume = function (clip_id) {
      let clip = get_clip(clip_id);
      return clip.get_volume();
    },
    get_time = function (clip_id) {
      let clip = get_clip(clip_id);
      return clip.get_time();
    },
    muted = function (clip_id) {
      let clip = get_clip(clip_id);
      return clip.muted();
    },
    looping = function (clip_id) {
      let clip = get_clip(clip_id);
      return clip.looping();
    },
    duration = function (clip_id) {
      let clip = get_clip(clip_id);
      return clip.duration();
    },
    pause_all = function () {
      let i = null;

      for (i in clips) {
        if (clips[i].playing()) {
          clips[i].pause();
          currently_paused.push(clips[i].id);
        }
      }
    },
    unpause_all = function () {
      let i = null;

      for (i in currently_paused) {
        get_clip(currently_paused[i]).play();
      }
      currently_paused = [];
    },
    stop_all = function () {
      let i = null;

      for (i in clips) {
        clips[i].stop();
      }
    },
    volume_all = function (level) {
      let i = null;

      for (i in clips) {
        clips[i].volume(level);
      }
    },
    mute_all = function (level) {
      let i = null;

      for (i in clips) {
        clips[i].mute();
      }

      all_muted = true;
    },
    unmute_all = function (level) {
      let i = null;

      for (i in clips) {
        clips[i].unmute();
      }

      all_muted = false;
    },
    are_all_muted = function () {
      return all_muted;
    };

  let load_clips = function (loaded_clips) {
    let clip = null,
      clip_data = null,
      i = null;

    for (i in loaded_clips) {
      clip_data = loaded_clips[i];
      console.log("loading clip " + clip_data.id);
      clip = {
        url: clip_data.url,
        id: clip_data.id,
        element: clip_data.element,
        play: function () {
          this.element.play();
        },
        pause: function () {
          this.element.pause();
        },
        stop: function () {
          this.element.pause();
          this.element.currentTime = 0;
        },
        volume: function (level) {
          this.element.volume = level;
        },
        set_time: function (time) {
          this.element.currentTime = time;
        },
        mute: function () {
          this.element.muted = true;
        },
        unmute: function () {
          this.element.muted = false;
        },
        loop: function (looping_bool) {
          this.element.loop = looping_bool;
        },
        playing: function () {
          return !this.element.paused;
        },
        paused: function () {
          return this.element.paused;
        },
        get_volume: function () {
          return this.element.volume;
        },
        get_time: function () {
          return this.element.currentTime;
        },
        muted: function () {
          return this.element.muted;
        },
        looping: function () {
          return this.element.looping;
        },
        duration: function () {
          return this.element.duration;
        }
      }

      if (clips && clips[clip.id]) {
        console.log("attempted to load multiple identical clip ids");
        clip.id = clip.id + "_" + timestamp_id();
      }

      if (clips === null) {
        clips = {};
      }
      clips[clip.id] = clip;
    }
  };

  let init = function (_manager) {
    console.log("AudioManager init.");
    manager = _manager;
    default_volume = manager.get('config').get_config()['default_volume'] || 1;
    currently_paused = [];
    all_muted = false;
    resource_manager = manager.get('resource');
  };

  return function () {
    return {
      init: init,
      get_clip: get_clip,
      play: play,
      pause: pause,
      stop: stop,
      volume: volume,
      set_time: set_time,
      mute: mute,
      unmute: unmute,
      loop: loop,
      playing: playing,
      paused: paused,
      get_volume: get_volume,
      get_time: get_time,
      muted: muted,
      looping: looping,
      duration: duration,
      pause_all: pause_all,
      unpause_all: unpause_all,
      stop_all: stop_all,
      volume_all: volume_all,
      mute_all: mute_all,
      unmute_all: unmute_all,
      are_all_muted: are_all_muted,
      load_clips: load_clips,
    };
  };
})();



let RenderManager = (function () {
  let manager = null,
    context_manager = null,
    frames_per_second = null,
    last_time = performance.now(),
    current_time = performance.now(),
    entities = null,
    resources = null,
    stored_count = null,

    draw = function (tile, context, delta, offset) {
      let resource = resources.get_image(tile.img),
        source_x = 0, source_y = 0, source_width = 0, source_height = 0,
        x_pos = 0, y_pos = 0,
        saved_style = null;

      x_pos = tile.x - offset.x;
      y_pos = tile.y - offset.y
      if (tile.offset_type === "camera") {
        x_pos = tile.ui_x;
        y_pos = tile.ui_y;
      }

      if (resource && tile.active !== false) {
        source_x = tile.source_x || resource.source_x;
        source_y = tile.source_y || resource.source_y;
        source_width = tile.source_width || resource.source_width;
        source_height = tile.source_height || resource.source_height;

        context.drawImage(
          resource.img,
          source_x, source_y,
          source_width, source_height,
          x_pos, y_pos,
          tile.x_scale * source_width,
          tile.y_scale * source_height
        );
      } else if (tile.render_type === "fillRect") {
        saved_style = context.fillStyle;
        context.fillStyle = tile.img;
        context.fillRect(x_pos, y_pos, tile.x_size, tile.y_size);
        context.fillStyle = saved_style;
      } else if (tile.render_type === "strokeRect") {
        saved_style = context.strokeStyle;
        context.strokeStyle = tile.img;
        context.strokeRect(x_pos, y_pos, tile.x_size, tile.y_size);
        context.strokeStyle = saved_style;
      }
    },
    text_draw = function (text, context, delta, offset) {
      let x = text.x,
        y = text.y;

      if (text.offset_type !== "camera") {
        x = x - offset.x;
        y = y - offset.y;
      }

      context.fillStyle = text.color;
      context.font = text.font;
      context.fillText(text.text, x, y);
    },
    next_frame = function () {
      current_time = performance.now();
      let delta = ((current_time - last_time)/1000) * frames_per_second;
      let di = null,
        ti = null;
      last_time = current_time;

      let world_offset = manager.get('camera').get_offset(),
        draw_list = entities.get_entities(),
        text_list = entities.get_texts(),
        context = context_manager.get_context();

      for (di in draw_list) {
        draw(draw_list[di], context, delta, world_offset);
      }
      for (ti in text_list) {
        text_draw(text_list[ti], context, delta, world_offset);
      }
      entities.update(delta, manager);
      entities.load_if_needed();

      requestAnimationFrame(next_frame);
    },
    init = function (_manager) {
      console.log("RenderManager init.");
      manager = _manager;
      frames_per_second = manager.get('config').get_config()['frames_per_second'];
      context_manager = manager.get('context');
      resources = manager.get('resource');
      entities = manager.get('entity');
    };

  return function () {
    return {
      init: init,
      next_frame: next_frame,
    };
  };
})();
