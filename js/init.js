(function($){
  $(function(){

    $('.sidenav').sidenav();

  }); // end of document ready
})(jQuery); // end of jQuery name space
document.addEventListener('DOMContentLoaded', function() {
  var elems = document.querySelectorAll('.datepicker');
  var instances = M.Datepicker.init(elems, {
    // 【最重要】カレンダーのHTML要素を、検索フォームの中ではなく
    // <body>直下に逃がすことで、画像のように潰れるバグを完全にシャットアウトします。
    container: document.body,
    
    // 必要に応じて他のオプション（自動で閉じる、日付形式など）
    autoClose: true,
    format: 'yyyy/mm/dd'
  });
});
