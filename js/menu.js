
SR.Menu = SR.View.extend({
  events: {
    'click a': 'selectLink'
  },

  selectLink: function(e) {
    this.$el.find('.current').removeClass('current');
    $(e.target).addClass('current');
  }
});

new SR.Menu({
  el: $('header')
});

