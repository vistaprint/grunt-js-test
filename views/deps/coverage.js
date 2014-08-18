$('select#report').on('change', function () {
  location.href = '/jscoverage?report=' + encodeURIComponent($(this).val());
});