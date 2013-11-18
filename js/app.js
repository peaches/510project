
SR = {};

SR.App = Backbone.Router.extend({
  routes: {
    '': 'index',
    'docs': 'docs',
    'proto': 'proto'
  },

  index: function() {
    console.log('index');
  },

  docs: function() {
    console.log('docs');
  },

  proto: function() {
    var container = $('#phone');
    var model = new Backbone.Model({
      ringer: true,
      shake: false,
      flip: false,
      calendar: false,
      crowd: false
    });

    SR.phoneInstance = new SR.HomeScreen({model: model}).render();
    SR.phoneInstance.$el.appendTo(container);

    (new SR.AppOverview({model: model}))
      .render()
      .$el.hide().appendTo(container);

    (new SR.ScheduleRecurring({model: model}))
      .render()
      .$el.hide().appendTo(container);
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

  openApp: function() {
    this.screen('app');
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
    'click header': 'exitApp'
  },

  toggleRing: function(e) {
    this.toggle('ringer');
  },

  toggleShake: function(e) {
    this.toggle('shake');
  },

  toggleFlip: function(e) {
    this.toggle('flip');
  },

  toggleCalendar: function(e) {
    this.toggle('calendar');
  },

  toggle: function(key) {
    var mode = this.model.get(key);
    this.model.set(key, !mode);
    this.render();
  },

  openRecurringScreen: function() {
    this.slideIn('recurring');
    // this.screen('recurring');
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


