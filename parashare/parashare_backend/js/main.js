/**
 * パラシェア ランディングページ - メインJavaScript
 * モバイル最適化とユーザー体験向上のための機能を実装
 */

// DOM読み込み完了後に実行
document.addEventListener('DOMContentLoaded', function() {
    // 機能の初期化
    initializeAnimations();
    initializeSmoothScroll();
    initializeDownloadTracking();
    initializeMobileOptimizations();
    initializeAccessibility();
});

/**
 * アニメーション機能の初期化
 * スクロール時の要素表示アニメーション
 */
function initializeAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // アニメーション対象の要素を監視
    const animateElements = document.querySelectorAll('.feature-item, .step, .about-content');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // ヒーローセクションのパララックス効果（モバイル以外）
    if (window.innerWidth > 768) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const heroBackground = document.querySelector('.hero-background');
            if (heroBackground) {
                heroBackground.style.transform = `translateY(${scrolled * 0.5}px)`;
            }
        });
    }
}

/**
 * スムーズスクロール機能の初期化
 */
function initializeSmoothScroll() {
    // スクロールインジケーターのクリック処理
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            const aboutSection = document.getElementById('about');
            if (aboutSection) {
                aboutSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // 内部リンクのスムーズスクロール
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return; // ダミーリンクの場合は何もしない
            
            e.preventDefault();
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * ダウンロードボタンのトラッキング機能
 */
function initializeDownloadTracking() {
    const downloadButtons = document.querySelectorAll('.download-btn');
    
    downloadButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // 実際のアプリストアリンクが設定されるまではダミー
            if (this.getAttribute('href') === '#') {
                e.preventDefault();
                
                // ボタンの種類を判定
                const isAppStore = this.classList.contains('app-store');
                const store = isAppStore ? 'App Store' : 'Google Play';
                
                // フィードバック表示
                showDownloadFeedback(store);
                
                // アナリティクス（実装時に有効化）
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'click', {
                        event_category: 'download',
                        event_label: store,
                        value: 1
                    });
                }
            }
        });
    });
}

/**
 * ダウンロードフィードバックの表示
 */
function showDownloadFeedback(store) {
    // 既存のフィードバックを削除
    const existingFeedback = document.querySelector('.download-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }

    // フィードバック要素の作成
    const feedback = document.createElement('div');
    feedback.className = 'download-feedback';
    feedback.innerHTML = `
        <div class="feedback-content">
            <i class="fas fa-info-circle"></i>
            <span>${store}でのダウンロードは近日公開予定です！</span>
        </div>
    `;

    // スタイルの設定
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #2ECC71;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideInDown 0.3s ease;
        font-size: 14px;
        font-weight: 500;
        max-width: 90vw;
    `;

    document.body.appendChild(feedback);

    // 3秒後に自動削除
    setTimeout(() => {
        if (feedback && feedback.parentNode) {
            feedback.style.animation = 'slideOutUp 0.3s ease forwards';
            setTimeout(() => {
                if (feedback && feedback.parentNode) {
                    feedback.remove();
                }
            }, 300);
        }
    }, 3000);

    // クリックで削除
    feedback.addEventListener('click', () => {
        feedback.style.animation = 'slideOutUp 0.3s ease forwards';
        setTimeout(() => {
            if (feedback && feedback.parentNode) {
                feedback.remove();
            }
        }, 300);
    });
}

/**
 * モバイル最適化機能
 */
function initializeMobileOptimizations() {
    // ビューポートの高さをCSS変数に設定（モバイルブラウザのアドレスバー対応）
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
    });

    // タッチデバイスでのホバー効果の調整
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
    }

    // モバイルでのダブルタップズーム防止
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

/**
 * アクセシビリティ機能の強化
 */
function initializeAccessibility() {
    // キーボードナビゲーション対応
    document.addEventListener('keydown', function(e) {
        // Enterキーでダウンロードボタンを押下
        if (e.key === 'Enter' && e.target.classList.contains('download-btn')) {
            e.target.click();
        }

        // Escapeキーでフィードバックを閉じる
        if (e.key === 'Escape') {
            const feedback = document.querySelector('.download-feedback');
            if (feedback) {
                feedback.click();
            }
        }
    });

    // フォーカスの可視化強化
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });

    document.addEventListener('mousedown', function() {
        document.body.classList.remove('keyboard-navigation');
    });

    // スクリーンリーダー向けのライブリージョン
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
    `;
    document.body.appendChild(liveRegion);

    // ダウンロードボタンクリック時のアナウンス
    document.querySelectorAll('.download-btn').forEach(button => {
        button.addEventListener('click', function() {
            const store = this.classList.contains('app-store') ? 'App Store' : 'Google Play';
            liveRegion.textContent = `${store}でのダウンロードページに移動します`;
        });
    });
}

/**
 * パフォーマンス最適化
 */
// 画像の遅延読み込み（必要に応じて）
function initializeLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

/**
 * エラーハンドリング
 */
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    // 本番環境ではエラーログサービスに送信
});

// CSS Animation keyframes for feedback
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInDown {
        from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }

    @keyframes slideOutUp {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
    }

    .keyboard-navigation *:focus {
        outline: 2px solid #2ECC71 !important;
        outline-offset: 2px !important;
    }

    .touch-device .download-btn:hover {
        transform: none;
    }

    .feedback-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .download-feedback {
        cursor: pointer;
    }
`;
document.head.appendChild(style);

// Service Worker registration（将来的なPWA対応）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // navigator.serviceWorker.register('/sw.js'); // 実装時に有効化
    });

}
