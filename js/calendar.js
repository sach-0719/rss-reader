document.addEventListener('DOMContentLoaded', () => {
  // DOM要素の取得
  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  const overlay = document.getElementById('datepicker-overlay');
  const grid = document.getElementById('datepicker-grid');
  const currentMonthYearText = document.getElementById('current-month-year');
  const displayYear = document.getElementById('display-year');
  const displayDate = document.getElementById('display-date');
  
  // 今どちらの入力欄（開始日 or 終了日）を操作しているかを記録する変数
  let activeInputTarget = null;

  // 日付管理用の状態（State）
  let currentDate = new Date();    // カレンダーが現在表示している年月
  let selectedDate = new Date();   // 確定した日付
  let temporaryDate = new Date();  // モーダル内で一時的に選択している日付

  // カレンダー用定数
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // 1. カレンダーを開く共通処理
  function openCalendar(targetInput) {
    activeInputTarget = targetInput; // 操作対象を保存

    // すでに値が入っている場合はその日付をベースにし、空なら今日にする
    if (targetInput.value) {
      const parsedDate = new Date(targetInput.value);
      if (!isNaN(parsedDate.getTime())) {
        selectedDate = parsedDate;
      } else {
        selectedDate = new Date();
      }
    } else {
      selectedDate = new Date();
    }

    temporaryDate = new Date(selectedDate);
    currentDate = new Date(selectedDate);
    
    renderCalendar();
    updateLeftDisplay(temporaryDate);
    
    // 【重要】Materializeに邪魔されないよう、最前面（z-index: 10000以上）で強制的にflex表示する
    overlay.style.setProperty('display', 'flex', 'important');
  }

  // 開始日・終了日それぞれのクリックイベントに紐付け
  if (dateFromInput) {
    dateFromInput.addEventListener('click', (e) => {
      e.stopPropagation(); // Materializeのイベント発火を止める
      openCalendar(dateFromInput);
    });
  }
  if (dateToInput) {
    dateToInput.addEventListener('click', (e) => {
      e.stopPropagation(); // Materializeのイベント発火を止める
      openCalendar(dateToInput);
    });
  }

  // 2. カレンダー生成メインロジック
  function renderCalendar() {
    grid.innerHTML = '';
    
    // 曜日のヘッダー行を生成
    weekDays.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'week-day';
      dayHeader.innerText = day;
      grid.appendChild(dayHeader);
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 中央上部の「Month Year」テキストを更新
    currentMonthYearText.innerText = `${months[month]} ${year}`;

    // 各種日付計算
    const firstDayIndex = new Date(year, month, 1).getDay();     // 1日の曜日インデックス
    const totalDays = new Date(year, month + 1, 0).getDate();     // 今月の総日数
    const prevTotalDays = new Date(year, month, 0).getDate();     // 前月の総日数

    // 【前月分】の埋め合わせ
    for (let i = firstDayIndex; i > 0; i--) {
      createDayCell(prevTotalDays - i + 1, true, year, month - 1);
    }

    // 【当月分】の日付セル
    for (let i = 1; i <= totalDays; i++) {
      createDayCell(i, false, year, month);
    }

    // 【翌月分】の埋め合わせ（常に合計6行＝42マスにする）
    const remainingCells = 42 - (firstDayIndex + totalDays);
    for (let i = 1; i <= remainingCells; i++) {
      createDayCell(i, true, year, month + 1);
    }
  }

  // 3. 日付ボタン要素を作成する関数
  function createDayCell(dayNum, isOtherMonth, year, month) {
    const btn = document.createElement('button');
    btn.className = 'day-cell';
    btn.innerText = dayNum;

    const thisCellDate = new Date(year, month, dayNum);

    if (isOtherMonth) {
      btn.classList.add('other-month');
    }

    // モーダル内で一時選択中の日付と完全に一致するか判定
    if (thisCellDate.toDateString() === temporaryDate.toDateString()) {
      btn.classList.add('is-selected');
    }

    // 日付クリック時のイベント
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      temporaryDate = thisCellDate;
      updateLeftDisplay(temporaryDate);
      renderCalendar(); // 再描画
    });

    grid.appendChild(btn);
  }

  // 4. 左側（スマホは上部）の大きな日付表示を書き換える
  function updateLeftDisplay(date) {
    displayYear.innerText = date.getFullYear();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    
    // 英語表記をMaterialize風の改行形式に整形
    const formatted = date.toLocaleDateString('en-US', options).replace(',', ',<br>');
    displayDate.innerHTML = formatted;
  }

  // 5. 前月・翌月ボタンの移動イベント
  document.getElementById('prev-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  document.getElementById('next-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // 6. 決定（OK）およびキャンセルボタンの処理
  document.getElementById('ok-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    selectedDate = new Date(temporaryDate);
    
    // YYYY/MM/DD 形式で現在アクティブなinputに値をセット
    if (activeInputTarget) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      activeInputTarget.value = `${yyyy}/${mm}/${dd}`;
    }
    closeCalendar();
  });

  document.getElementById('cancel-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    closeCalendar();
  });

  // カレンダーを閉じる共通処理
  function closeCalendar() {
    overlay.style.setProperty('display', 'none', 'important');
    activeInputTarget = null;
  }

  // カレンダーの外側（黒い背景部分）をクリックしても閉じる
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeCalendar();
    }
  });
});
