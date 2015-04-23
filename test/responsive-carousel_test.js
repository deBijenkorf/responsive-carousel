(function ($) {
  module('carousel [data-dbk-carousel]', {
    setup: function () {
      this.elems = $('[data-dbk-carousel]').children();
    }
  });

  test('is carousel', function () {
    expect(1);
    deepEqual(this.elems.children(), $('[data-dbk-carousel]').get(0));
  });
}(jQuery));
