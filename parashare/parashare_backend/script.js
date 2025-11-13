document.addEventListener('DOMContentLoaded', (event) => {
    // フォーム送信時の処理を定義
    const form = document.getElementById('requestForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // ページ遷移を停止

        // フォームの内容を送信完了メッセージに置き換える
        const container = document.querySelector('.form-container');
        container.innerHTML = `
            <div style="text-align: center;">
                <h1>送信が完了しました！</h1>
                <p>担当者より、後日ご連絡いたします。</p>
            </div>
        `;
    });
});