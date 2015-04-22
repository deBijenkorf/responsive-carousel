(function ($) {
  module(':responsiveCarousel selector', {
    setup: function () {
      this.elems = $('#qunit-fixture').children();
    }
  });

  test('is responsiveCarousel', function () {
    expect(1);
    deepEqual(this.elems.filter(':responsiveCarousel').get(), this.elems.last().get());
  });
}(jQuery));
