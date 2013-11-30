
SR = {};

SR.App = Backbone.Router.extend({
  routes: {
    '': 'index',
    'docs': 'docs',
    'proto': 'proto'
  },

  initialize: function() {
    SR.mp3 = new Audio('ringer.mp3');
    var $proto = $('#proto');

    $proto.on('click', '.call', _.bind(this.dispatch, this, 'receiveCall'));
    $proto.on('click', '.flip', _.bind(this.dispatch, this, 'toggleFlip'));
    $proto.on('click', '.shake', _.bind(this.dispatch, this, 'shakePhone'));

    this.selectCurrent(window.location.hash.substr(1));
  },

  dispatch: function(name, e) {
    e.preventDefault();
    if (SR.phoneInstance) {
      var func = SR.phoneInstance[name];
      if (func) {
        func.apply(SR.phoneInstance);
      }
    }
  },

  selectCurrent: function(menuItem) {
    menuItem = menuItem || 'index';
    $('header .' + menuItem).addClass('current');
  },

  hideAll: function() {
    $('.main > *').hide();
  },

  index: function() {
    this.hideAll();
    $('#index').show();
  },

  docs: function() {
    this.hideAll();
    $('#docs').show();
  },

  proto: function() {
    this.hideAll();
    $('#proto').show();
    var container = $('#phone');
    var model = new Backbone.Model({
      ringer: true,
      shake: false,
      flip: false,
      isFlipped: false,
      calendar: false,
      crowd: false
    });

    if (!SR.phoneInstance) {
      SR.phoneInstance = new SR.HomeScreen({model: model}).render();
      SR.phoneInstance.$el.appendTo(container);

      (new SR.AppOverview({model: model}))
        .render()
        .$el.hide().appendTo(container);

      (new SR.ScheduleRecurring({model: model}))
        .render()
        .$el.hide().appendTo(container);

      (new SR.MapProximity({model: model}))
        .render()
        .$el.hide().appendTo(container);

      (new SR.LocationMap({model: model}))
        .render()
        .$el.hide().appendTo(container);
    }
  }
});

SR.View = Backbone.View.extend({
  bindings: {},
  screenName: null,

  constructor: function() {
    var results = Backbone.View.prototype.constructor.apply(this, arguments);
    if (this.init) {
      this.init();
    }

    this.bindModelEvents();

    if (this.model) {
      if (this.screenName) {
        this.model.on('screen:' + this.screenName, this.show, this);
        this.model.on('slidein:' + this.screenName, this.slidingIn, this);
      }
    }

    return results;
  },

  bindModelEvents: function() {
    if (this.model) {
      _.each(this.bindings, function(v, k) {
        this.model.on(k, this[v], this);
      }, this);
    }
  },

  screen: function(name) {
    this.$el.hide();
    this.model.trigger('screen:' + name);
  },

  show: function() {
    this.$el.show();
  },

  slideIn: function(name) {
    // We want to slide the next one in, so we must do the animation
    // then trigger the hide.
    this.model.trigger('slidein:' + name, this);
  },

  slidingIn: function(oldView) {
    // Position this offscreen and then transition it in
    this.render().$el.show();

    var content = this.$el.find('.content');
    content.addClass('slidein');

    _.defer(function() {
      content.removeClass('slidein');
    });
  },

  slideOut: function() {
    this.slidingOut();
  },

  slidingOut: function() {
    var content = this.$el.find('.content');
    content.addClass('slideout');
    setTimeout(_.bind(function() {
      content.removeClass('slideout');
      this.$el.hide();
    }, this), 700);
  },

  render: function() {
    var dict = {};
    if (this.model) {
      dict = this.model.toJSON();
    }

    if (this.template) {
      var html = this.template(dict);
      this.$el.empty().append(html);
    }

    return this;
  }
});

SR.HomeScreen = SR.View.extend({
  className: 'phone home-screen',
  template: _.template($('#phone-home-screen').html()),
  screenName: 'home',

  events: {
    'click .button-overlay': 'openApp'
  },

  initialize: function() {
    // upon initialize, we hook into the body for a double click
    $('body').keypress(_.bind(function(e) {
      if (e.keyCode === 99) {
        this.ring();
      }
    }, this));
  },

  openApp: function() {
    this.screen('app');
  },

  receiveCall: function() {
    if (this.model.get('flip')) {
      if (!this.model.get('isFlipped')) {
        this.ring();
      }
    } else {
      this.ring();
    }
  },

  getPhone: function() {
    return $('#phone');
  },

  toggleFlip: function() {
    // hack, but this works for the limited time
    var phone = this.getPhone();
    phone.fadeOut(function() {
      phone.toggleClass('flipped');
      phone.fadeIn();
    });
    this.model.set('isFlipped', !this.model.get('isFlipped'));

    if (this.model.get('flip')) {
      this.stopRing();
    }
  },

  shakePhone: function() {
    var phone = this.getPhone();
    phone.addClass('animated shake');

    setTimeout(function() {
      phone.removeClass('animated shake');
    }, 1200);

    if (this.model.get('shake')) {
      this.stopRing();
    }
  },

  ring: function() {
    if (this.model.get('ringer')) {
      SR.mp3.play();
    }
  },

  stopRing: function() {
    SR.mp3.pause();
    SR.mp3.load();
  }
});

SR.AppOverview = SR.View.extend({
  className: 'phone app-screen',
  template: _.template($('#phone-main-screen').html()),
  screenName: 'app',

  events: {
    'click .ringer-toggle': 'toggleRing',
    'click .tactile-shake': 'toggleShake',
    'click .tactile-flip': 'toggleFlip',
    'click .scheduling-calendar': 'toggleCalendar',
    'click .scheduling-recurring': 'openRecurringScreen',
    'click .proximity-location': 'openProximityScreen',
    'click header': 'exitApp'
  },

  toggleRing: function(e) {
    e.preventDefault();
    this.toggle('ringer');

    // one more hack, ahh well :)
    if (!this.model.get('ringer')) {
      SR.phoneInstance.stopRing();
    }
  },

  toggleShake: function(e) {
    e.preventDefault();
    this.toggle('shake');
  },

  toggleFlip: function(e) {
    e.preventDefault();
    this.toggle('flip');
  },

  toggleCalendar: function(e) {
    e.preventDefault();
    this.toggle('calendar');
  },

  toggle: function(key) {
    var mode = this.model.get(key);
    this.model.set(key, !mode);
    this.render();
  },

  openRecurringScreen: function() {
    this.slideIn('recurring');
  },

  openProximityScreen: function() {
    this.slideIn('proximity');
  },

  exitApp: function() {
    this.screen('home');
  }
});

SR.ScheduleRecurring = SR.View.extend({
  className: 'phone recurring-screen',
  template: _.template($('#phone-recurring-screen').html()),
  screenName: 'recurring',

  events: {
    'click header': 'openAppScreen'
  },

  openAppScreen: function() {
    this.slideOut();
  }
});

SR.MapProximity = SR.View.extend({
  className: 'phone proximity-screen',
  template: _.template($('#phone-proximity-screen').html()),
  screenName: 'proximity',

  events: {
    'click header': 'openAppScreen',
    'click .add': 'showMap'
  },

  openAppScreen: function() {
    this.slideOut();
  },

  showMap: function() {
    this.slideIn('location-map');
  }
});

SR.LocationMap = SR.View.extend({
  className: 'phone location-map-screen',
  template: _.template($('#phone-add-location-screen').html()),
  screenName: 'location-map',
  dragging: false,

  events: {
    'click header': 'openAppScreen',
    'dragover .map-picture': 'dragOver',
    'drop .map-picture': 'drop',

    // radius effect
    'mousedown .map-inner-radius': 'innerRadius',
    'mousedown .map-radius': 'mouseDown',
    'mousemove .map-picture': 'mouseMove',
    'mouseup .map-picture': 'mouseUp'
  },

  dragOver: function(e) {
    e.preventDefault();
  },

  openAppScreen: function() {
    this.slideOut();
  },

  drop: function(e) {
    if (!this.dragging) {
      var offset = this.$el.find('.map-picture').offset(),
          center = {x: e.originalEvent.pageX, y: e.originalEvent.pageY};

      this.$el.find('.map-pin').css({
        left: center.x - offset.left - 12,
        top: center.y - offset.top - 12
      });

      this.pinLocation = center;
      this.mapOffset = offset;

      this.centerDiv(this.$el.find('.map-radius'));
      this.centerDiv(this.$el.find('.map-inner-radius'));
    }
  },

  centerDiv: function($el, center, offset) {
    center = center || this.pinLocation;
    offset = offset || this.mapOffset;

    var centerX = center.x - $el.width() / 2;
    var centerY = center.y + 5 - $el.height() / 2;

    $el.css({
      left: centerX - offset.left,
      top: centerY - offset.top
    });
  },

  innerRadius: function(e) {
    e.stopPropagation();
    return false;
  },

  mouseDown: function(e) {
    this.dragging = true;
  },

  mouseUp: function(e) {
    this.dragging = false;
  },

  mouseMove: function(e) {
    if (this.dragging) {
      // calculate the distance between mouse and pin
      var dx = e.pageX - this.pinLocation.x;
      var dy = e.pageY - this.pinLocation.y;
      var distance = Math.sqrt(dx * dx + dy * dy);

      var $radius = this.$el.find('.map-radius');
      var $innerRadius = this.$el.find('.map-inner-radius');

      if (distance < 25) {
        distance = 25;
      }

      if (distance > 150) {
        distance = 150;
      }

      distance *= 2;

      $radius.css({
        width: distance,
        height: distance,
        borderRadius: distance
      });

      $innerRadius.css({
        width: distance - 10,
        height: distance - 10,
        borderRadius: distance
      });

      this.centerDiv($radius);
      this.centerDiv($innerRadius);
    }
  }
});



