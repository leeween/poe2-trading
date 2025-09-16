// POE2 交易市场搜索记录内容脚本
(function () {
    'use strict';

    console.log('POE2 交易助手已加载');

    let historyPanel = null;
    let searchHistory = [];
    let isQQServer = window.location.hostname === 'poe.game.qq.com';

    // 等待页面加载完成
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    // 创建历史记录面板
    function createHistoryPanel() {
        if (historyPanel) return historyPanel;

        const panel = document.createElement('div');
        panel.id = 'poe2-main-panel';
        panel.innerHTML = `
            <div class="poe2-history-header">
                <h3><span class="poe2-logo">⚖</span>POE2 国服交易助手</h3>
                <div class="poe2-history-controls">
                    <button id="poe2-refresh-btn" title="刷新">↻</button>
                    <button id="poe2-clear-btn" title="清空历史">✕</button>
                </div>
            </div>
            <div class="poe2-tabs">
                <button class="poe2-tab-btn active" data-tab="history">搜索历史</button>
                <button class="poe2-tab-btn" data-tab="favorites">收藏</button>
            </div>
            <div class="poe2-tab-content">
                <div class="poe2-tab-panel active" id="poe2-history-panel">
                    <div class="poe2-history-content" id="poe2-history-list">
                        <div class="poe2-loading">正在加载历史记录...</div>
                    </div>
                </div>
                <div class="poe2-tab-panel" id="poe2-favorites-panel">
                    <div class="poe2-favorites-toolbar">
                        <button id="poe2-add-folder-btn" class="poe2-action-btn">📁 新建文件夹</button>
                        <button id="poe2-add-favorite-btn" class="poe2-action-btn">⭐ 收藏当前搜索</button>
                    </div>
                    <div class="poe2-favorites-content" id="poe2-favorites-list">
                        <div class="poe2-empty">暂无收藏</div>
                    </div>
                </div>
            </div>
        `;

        // 创建toggle按钮
        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'poe2-toggle-btn';
        toggleBtn.innerHTML = '◄';
        toggleBtn.title = '收起/展开历史面板';

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            /* 调整页面布局，为插件留出空间 */
            body.poe2-plugin-active {
                margin-right: 350px;
                transition: margin-right 0.3s ease;
            }

            body.poe2-plugin-active.poe2-plugin-collapsed {
                margin-right: 0;
            }

            #poe2-main-panel {
                position: fixed;
                top: 0;
                right: 0;
                width: 350px;
                height: 100vh;
                background: linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(30, 25, 20, 0.95) 100%);
                border-left: 3px solid #c9aa71;
                box-shadow: -8px 0 32px rgba(201, 170, 113, 0.3), inset 0 0 50px rgba(201, 170, 113, 0.1);
                z-index: 10000;
                font-family: 'Cinzel', 'Times New Roman', serif;
                color: #f4e4c1;
                backdrop-filter: blur(15px);
                transition: transform 0.3s ease;
                transform: translateX(0);
                display: flex;
                flex-direction: column;
            }

            #poe2-main-panel.collapsed {
                transform: translateX(350px);
            }

            #poe2-toggle-btn {
                position: fixed;
                top: 8px;
                right: 350px;
                width: 50px;
                height: 40px;
                background: linear-gradient(135deg, #c9aa71 0%, #ffd700 50%, #c9aa71 100%);
                border: 2px solid #ffd700;
                border-right: none;
                border-radius: 12px 0 0 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                color: #1a1a1a;
                z-index: 10001;
                transition: all 0.3s ease;
                backdrop-filter: blur(15px);
                box-shadow: -6px 0 20px rgba(201, 170, 113, 0.4), 
                           inset 0 2px 4px rgba(255, 255, 255, 0.2),
                           inset 0 -2px 4px rgba(0, 0, 0, 0.2);
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                font-weight: bold;
            }

            #poe2-toggle-btn:hover {
                background: linear-gradient(135deg, #ffd700 0%, #fff 50%, #ffd700 100%);
                border-color: #fff;
                color: #1a1a1a;
                box-shadow: -8px 0 30px rgba(255, 215, 0, 0.6), 
                           inset 0 2px 6px rgba(255, 255, 255, 0.4),
                           inset 0 -2px 6px rgba(0, 0, 0, 0.1);
                transform: translateX(-3px) scale(1.05);
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
            }

            #poe2-toggle-btn:active {
                transform: translateX(-1px) scale(0.98);
                box-shadow: -4px 0 15px rgba(255, 215, 0, 0.4), 
                           inset 0 1px 3px rgba(255, 255, 255, 0.2),
                           inset 0 -1px 3px rgba(0, 0, 0, 0.3);
            }

            #poe2-main-panel.collapsed + #poe2-toggle-btn {
                right: 0;
            }

            .poe2-history-header {
                background: linear-gradient(135deg, #c9aa71 0%, #ffd700 50%, #c9aa71 100%);
                color: #1a1a1a;
                padding: 16px 20px;
                border-radius: 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 700;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                box-shadow: 0 2px 8px rgba(201, 170, 113, 0.4);
                border-bottom: 2px solid #c9aa71;
                position: relative;
            }

            .poe2-history-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, #ffd700, transparent);
            }

            .poe2-history-header h3 {
                margin: 0;
                font-size: 16px;
                font-family: 'Cinzel', 'Times New Roman', serif;
                letter-spacing: 1px;
                display: flex;
                align-items: center;
                gap: 8px;
                color: #333;
            }

            .poe2-logo {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: radial-gradient(circle, #ffd700 0%, #c9aa71 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: #1a1a1a;
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }

            .poe2-history-controls {
                display: flex;
                gap: 8px;
            }

            .poe2-history-controls button {
                background: rgba(20, 20, 30, 0.6);
                border: 1px solid #c9aa71;
                color: #c9aa71;
                width: 28px;
                height: 28px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .poe2-history-controls button:hover {
                background: rgba(201, 170, 113, 0.2);
                border-color: #ffd700;
                color: #ffd700;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(255, 215, 0, 0.3);
            }

            /* Tab系统样式 */
            .poe2-tabs {
                display: flex;
                border-bottom: 2px solid rgba(201, 170, 113, 0.3);
                background: rgba(0, 0, 0, 0.2);
            }

            .poe2-tab-btn {
                flex: 1;
                padding: 12px 16px;
                background: transparent;
                border: none;
                color: rgba(244, 228, 193, 0.7);
                font-size: 13px;
                font-family: 'Cinzel', 'Times New Roman', serif;
                cursor: pointer;
                transition: all 0.2s ease;
                border-bottom: 2px solid transparent;
                font-weight: 500;
            }

            .poe2-tab-btn:hover {
                color: #ffd700;
                background: rgba(201, 170, 113, 0.1);
            }

            .poe2-tab-btn.active {
                color: #ffd700;
                border-bottom-color: #ffd700;
                background: rgba(201, 170, 113, 0.15);
                font-weight: 600;
            }

            .poe2-tab-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
            }

            .poe2-tab-panel {
                display: none;
                flex: 1;
                flex-direction: column;
                min-height: 0;
                overflow: hidden;
            }

            .poe2-tab-panel.active {
                display: flex;
            }

            .poe2-history-content {
                flex: 1;
                overflow-y: auto;
                padding: 0;
            }

            .poe2-history-item {
                padding: 16px 20px;
                border-bottom: 1px solid rgba(201, 170, 113, 0.2);
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                background: rgba(0, 0, 0, 0.1);
                margin: 2px 8px;
                border-radius: 8px;
                border-left: 3px solid transparent;
            }

            .poe2-history-item:hover {
                background: rgba(201, 170, 113, 0.15);
                border-left-color: #c9aa71;
                transform: translateX(2px);
                box-shadow: 0 2px 8px rgba(201, 170, 113, 0.2);
            }

            .poe2-history-item:last-child {
                border-bottom: none;
            }

            .poe2-item-title {
                font-size: 14px;
                font-weight: 600;
                color: #ffd700;
                margin-bottom: 6px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-family: 'Cinzel', 'Times New Roman', serif;
                letter-spacing: 0.5px;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }

            .poe2-item-time {
                font-size: 11px;
                color: rgba(244, 228, 193, 0.7);
                margin-bottom: 6px;
                font-style: italic;
            }

            .poe2-item-params {
                font-size: 11px;
                color: #c9aa71;
                line-height: 1.4;
                font-family: 'Cinzel', 'Times New Roman', serif;
            }

            .poe2-param-tag {
                display: inline-block;
                background: rgba(201, 170, 113, 0.3);
                padding: 2px 6px;
                margin: 2px 3px;
                border-radius: 4px;
                font-size: 10px;
                color: #ffd700;
                border: 1px solid rgba(201, 170, 113, 0.5);
                font-weight: 500;
                text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
            }

            .poe2-delete-btn {
                position: absolute;
                top: 10px;
                right: 16px;
                background: rgba(220, 53, 69, 0.8);
                color: #fff;
                border: 1px solid rgba(220, 53, 69, 0.6);
                width: 20px;
                height: 20px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 11px;
                display: none;
                align-items: center;
                justify-content: center;
                line-height: 1;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }

            .poe2-delete-btn:hover {
                background: rgba(220, 53, 69, 1);
                border-color: #dc3545;
                transform: scale(1.1);
                box-shadow: 0 3px 6px rgba(220, 53, 69, 0.4);
            }

            .poe2-history-item:hover .poe2-delete-btn {
                display: flex;
            }

            .poe2-loading, .poe2-empty {
                text-align: center;
                padding: 20px;
                color: rgba(244, 228, 193, 0.6);
                font-style: italic;
                font-size: 13px;
            }

            .poe2-stats {
                padding: 8px 16px;
                background: rgba(212, 175, 55, 0.1);
                font-size: 10px;
                color: #d4af37;
                text-align: center;
                border-bottom: 1px solid #333;
            }

            /* 收藏功能样式 */
            .poe2-favorites-toolbar {
                padding: 16px 20px;
                border-bottom: 1px solid rgba(201, 170, 113, 0.3);
                background: rgba(0, 0, 0, 0.2);
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .poe2-action-btn {
                flex: 1;
                min-width: 120px;
                padding: 10px 14px;
                background: linear-gradient(135deg, rgba(201, 170, 113, 0.8) 0%, rgba(255, 215, 0, 0.8) 100%);
                border: 2px solid #c9aa71;
                border-radius: 8px;
                color: #1a1a1a;
                font-size: 12px;
                font-family: 'Cinzel', 'Times New Roman', serif;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }

            .poe2-action-btn:hover {
                background: linear-gradient(135deg, #ffd700 0%, #fff 50%, #ffd700 100%);
                border-color: #fff;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
            }

            .poe2-action-btn:active {
                transform: translateY(0);
                box-shadow: 0 2px 6px rgba(255, 215, 0, 0.3);
            }

            .poe2-favorites-content {
                flex: 1;
                overflow-y: auto;
                padding: 0;
            }

            .poe2-root-favorites {
                padding: 0 8px;
            }

            .poe2-root-favorites .poe2-favorite-item {
                margin: 8px 0;
            }

            .poe2-folder {
                margin: 8px;
                border: 1px solid rgba(201, 170, 113, 0.3);
                border-radius: 8px;
                background: rgba(0, 0, 0, 0.1);
            }

            .poe2-folder-header {
                padding: 12px 16px;
                background: rgba(201, 170, 113, 0.2);
                border-bottom: 1px solid rgba(201, 170, 113, 0.3);
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.2s ease;
            }

            .poe2-folder-header:hover {
                background: rgba(201, 170, 113, 0.3);
            }

            .poe2-folder-title {
                font-size: 14px;
                font-weight: 600;
                color: #ffd700;
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                flex: 1;
            }

            .poe2-folder-actions {
                display: flex;
                align-items: center;
                gap: 4px;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .poe2-folder:hover .poe2-folder-actions {
                opacity: 1;
            }

            .poe2-folder-rename-btn,
            .poe2-folder-add-btn,
            .poe2-folder-delete-btn {
                width: 24px;
                height: 24px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .poe2-folder-rename-btn {
                background: rgba(135, 206, 235, 0.6);
                color: #1a1a1a;
            }

            .poe2-folder-rename-btn:hover {
                background: rgba(135, 206, 235, 0.9);
                transform: scale(1.1);
            }

            .poe2-folder-add-btn {
                background: rgba(255, 215, 0, 0.6);
                color: #1a1a1a;
            }

            .poe2-folder-add-btn:hover {
                background: rgba(255, 215, 0, 0.9);
                transform: scale(1.1);
            }

            .poe2-folder-delete-btn {
                background: rgba(220, 53, 69, 0.6);
                color: #fff;
            }

            .poe2-folder-delete-btn:hover {
                background: rgba(220, 53, 69, 0.9);
                transform: scale(1.1);
            }

            .poe2-folder-toggle {
                color: #c9aa71;
                font-size: 12px;
                transition: transform 0.2s ease;
                cursor: pointer;
                margin-left: 4px;
            }

            .poe2-folder.collapsed .poe2-folder-toggle {
                transform: rotate(-90deg);
            }

            .poe2-folder-content {
                padding: 8px;
                max-height: 300px;
                overflow-y: auto;
            }

            .poe2-folder.collapsed .poe2-folder-content {
                display: none;
            }

            .poe2-folder-toolbar {
                padding: 8px;
                border-bottom: 1px solid rgba(201, 170, 113, 0.2);
                margin-bottom: 8px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 6px;
            }

            .poe2-folder-toolbar .poe2-folder-add-btn {
                width: 100%;
                height: 32px;
                background: linear-gradient(135deg, rgba(255, 215, 0, 0.8) 0%, rgba(255, 215, 0, 0.6) 100%);
                border: 1px solid #ffd700;
                border-radius: 6px;
                color: #1a1a1a;
                font-size: 12px;
                font-family: 'Cinzel', 'Times New Roman', serif;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }

            .poe2-folder-toolbar .poe2-folder-add-btn:hover {
                background: linear-gradient(135deg, #ffd700 0%, #fff 50%, #ffd700 100%);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
            }

            .poe2-favorite-item {
                padding: 10px 16px;
                margin: 4px 0;
                background: rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(201, 170, 113, 0.2);
                border-radius: 6px;
                transition: all 0.2s ease;
                position: relative;
                display: flex;
                justify-content: space-between;
                align-items: center;
                min-height: 36px;
            }

            .poe2-favorite-item:hover {
                background: rgba(201, 170, 113, 0.15);
                border-color: #c9aa71;
                transform: translateX(2px);
            }

            .poe2-favorite-main {
                flex: 1;
                cursor: pointer;
            }

            .poe2-favorite-title {
                font-size: 14px;
                font-weight: 600;
                color: #ffd700;
                line-height: 1.4;
            }


            /* 拖拽相关样式 */
            .poe2-favorite-item.draggable {
                cursor: move;
            }

            .poe2-favorite-item.dragging {
                opacity: 0.5;
                transform: rotate(5deg);
                z-index: 1000;
            }

            .poe2-folder-content.drag-over {
                background: rgba(255, 215, 0, 0.2);
                border: 2px dashed #ffd700;
                border-radius: 8px;
            }

            .poe2-folder.drag-over .poe2-folder-header {
                background: rgba(255, 215, 0, 0.3);
            }

            .drag-indicator {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 215, 0, 0.1);
                border: 2px solid #ffd700;
                border-radius: 8px;
                pointer-events: none;
                z-index: 999;
            }

            /* Toast提示样式 */
            .poe2-toast {
                position: fixed;
                top: 20px;
                right: 370px;
                background: linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(30, 25, 20, 0.95) 100%);
                border: 2px solid #c9aa71;
                border-radius: 8px;
                padding: 12px 16px;
                color: #f4e4c1;
                font-family: 'Cinzel', 'Times New Roman', serif;
                font-size: 13px;
                font-weight: 600;
                z-index: 20000;
                min-width: 200px;
                max-width: 300px;
                box-shadow: 0 4px 16px rgba(201, 170, 113, 0.3);
                backdrop-filter: blur(10px);
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
            }

            .poe2-toast.show {
                transform: translateX(0);
                opacity: 1;
            }

            .poe2-toast.success {
                border-color: #c9aa71;
                background: linear-gradient(135deg, rgba(201, 170, 113, 0.9) 0%, rgba(255, 215, 0, 0.8) 100%);
                color: #1a1a1a;
            }

            .poe2-toast.warning {
                border-color: #ff8c00;
                background: linear-gradient(135deg, rgba(255, 140, 0, 0.9) 0%, rgba(255, 165, 0, 0.8) 100%);
                color: #1a1a1a;
            }

            .poe2-toast.error {
                border-color: #8b0000;
                background: linear-gradient(135deg, rgba(139, 0, 0, 0.9) 0%, rgba(178, 34, 34, 0.8) 100%);
                color: #f4e4c1;
            }

            .poe2-toast-icon {
                display: inline-block;
                margin-right: 8px;
                font-size: 16px;
            }

            /* 自定义输入对话框样式 */
            .poe2-input-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                z-index: 25000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .poe2-input-dialog {
                background: linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(30, 25, 20, 0.95) 100%);
                border: 2px solid #c9aa71;
                border-radius: 12px;
                width: 400px;
                max-width: 90vw;
                box-shadow: 0 8px 32px rgba(201, 170, 113, 0.3);
                font-family: 'Cinzel', 'Times New Roman', serif;
                color: #f4e4c1;
                backdrop-filter: blur(15px);
            }

            .poe2-input-dialog-header {
                padding: 16px 20px;
                border-bottom: 1px solid rgba(201, 170, 113, 0.3);
                background: rgba(201, 170, 113, 0.1);
                border-radius: 10px 10px 0 0;
            }

            .poe2-input-dialog-title {
                margin: 0;
                font-size: 16px;
                color: #ffd700;
                font-weight: 600;
                text-align: center;
            }

            .poe2-input-dialog-content {
                padding: 20px;
            }

            .poe2-input-dialog-label {
                display: block;
                margin-bottom: 8px;
                font-size: 14px;
                color: #c9aa71;
            }

            .poe2-input-dialog-input {
                width: 100%;
                padding: 12px 16px;
                background: rgba(20, 20, 30, 0.8);
                border: 2px solid #c9aa71;
                border-radius: 8px;
                color: #f4e4c1;
                font-size: 14px;
                font-family: 'Cinzel', 'Times New Roman', serif;
                transition: all 0.2s ease;
                box-sizing: border-box;
            }

            .poe2-input-dialog-input:focus {
                outline: none;
                border-color: #ffd700;
                background: rgba(20, 20, 30, 0.95);
                box-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
            }

            .poe2-input-dialog-footer {
                padding: 16px 20px;
                border-top: 1px solid rgba(201, 170, 113, 0.3);
                background: rgba(0, 0, 0, 0.2);
                border-radius: 0 0 10px 10px;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }

            .poe2-input-dialog-btn {
                padding: 10px 20px;
                border: 1px solid;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-family: 'Cinzel', 'Times New Roman', serif;
                font-weight: 600;
                transition: all 0.2s ease;
                min-width: 80px;
            }

            .poe2-input-dialog-btn-primary {
                background: linear-gradient(135deg, #c9aa71 0%, #ffd700 50%, #c9aa71 100%);
                border-color: #ffd700;
                color: #1a1a1a;
            }

            .poe2-input-dialog-btn-primary:hover {
                background: linear-gradient(135deg, #ffd700 0%, #fff 50%, #ffd700 100%);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
            }

            .poe2-input-dialog-btn-secondary {
                background: rgba(128, 128, 128, 0.6);
                border-color: #888;
                color: #f4e4c1;
            }

            .poe2-input-dialog-btn-secondary:hover {
                background: rgba(128, 128, 128, 0.8);
                transform: translateY(-1px);
            }

            .poe2-favorite-actions {
                display: flex;
                gap: 4px;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .poe2-favorite-item:hover .poe2-favorite-actions {
                opacity: 1;
            }

            .poe2-favorite-move-btn,
            .poe2-favorite-delete-btn {
                width: 24px;
                height: 24px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .poe2-favorite-move-btn {
                background: rgba(201, 170, 113, 0.6);
                color: #1a1a1a;
            }

            .poe2-favorite-move-btn:hover {
                background: rgba(255, 215, 0, 0.8);
                transform: scale(1.1);
            }

            .poe2-favorite-delete-btn {
                background: rgba(220, 53, 69, 0.6);
                color: #fff;
            }

            .poe2-favorite-delete-btn:hover {
                background: rgba(220, 53, 69, 0.9);
                transform: scale(1.1);
            }

            /* 滚动条样式 */
            .poe2-history-content::-webkit-scrollbar,
            .poe2-favorites-content::-webkit-scrollbar {
                width: 4px;
            }

            .poe2-history-content::-webkit-scrollbar-track,
            .poe2-favorites-content::-webkit-scrollbar-track {
                background: #2a2a3e;
            }

            .poe2-history-content::-webkit-scrollbar-thumb,
            .poe2-favorites-content::-webkit-scrollbar-thumb {
                background: #d4af37;
                border-radius: 2px;
            }

            .poe2-history-content::-webkit-scrollbar-thumb:hover,
            .poe2-favorites-content::-webkit-scrollbar-thumb:hover {
                background: #ffd700;
            }

            /* 响应式调整 */
            @media (max-width: 1200px) {
                body.poe2-plugin-active {
                    margin-right: 300px;
                }
                #poe2-main-panel {
                    width: 300px;
                }
                #poe2-toggle-btn {
                    right: 300px;
                }
                #poe2-main-panel.collapsed + #poe2-toggle-btn {
                    right: 0;
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(panel);
        document.body.appendChild(toggleBtn);

        // 添加body类名，启用插件布局
        document.body.classList.add('poe2-plugin-active');

        // 添加事件监听器
        setupPanelEvents(panel);

        // 添加toggle按钮事件
        toggleBtn.addEventListener('click', togglePanel);

        historyPanel = panel;

        // 恢复面板状态
        setTimeout(() => {
            restorePanelState();
        }, 100);

        return panel;
    }

    // 设置面板事件
    function setupPanelEvents(panel) {
        const refreshBtn = panel.querySelector('#poe2-refresh-btn');
        const clearBtn = panel.querySelector('#poe2-clear-btn');

        // Tab切换事件
        const tabBtns = panel.querySelectorAll('.poe2-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // 收藏功能事件
        const addFolderBtn = panel.querySelector('#poe2-add-folder-btn');
        const addFavoriteBtn = panel.querySelector('#poe2-add-favorite-btn');

        refreshBtn.addEventListener('click', () => {
            const activeTab = panel.querySelector('.poe2-tab-btn.active').dataset.tab;
            if (activeTab === 'history') {
                loadSearchHistory();
            } else {
                loadFavorites();
            }
        });

        clearBtn.addEventListener('click', () => {
            const activeTab = panel.querySelector('.poe2-tab-btn.active').dataset.tab;
            if (activeTab === 'history') {
                clearSearchHistory();
            } else {
                clearFavorites();
            }
        });

        addFolderBtn.addEventListener('click', createFolder);
        addFavoriteBtn.addEventListener('click', addCurrentSearchToFavorites);
    }

    // 移除拖拽功能 - 面板现在固定在右侧

    // 切换面板展开/收起
    function togglePanel() {
        historyPanel.classList.toggle('collapsed');
        document.body.classList.toggle('poe2-plugin-collapsed');

        // 更新toggle按钮图标
        const toggleBtn = document.getElementById('poe2-toggle-btn');
        const isCollapsed = historyPanel.classList.contains('collapsed');
        toggleBtn.innerHTML = isCollapsed ? '►' : '◄';

        // 保存当前状态
        chrome.storage.local.set({ 'poe2-panel-collapsed': isCollapsed });
        console.log('保存面板状态:', isCollapsed ? '收起' : '展开');
    }

    // 恢复面板状态
    async function restorePanelState() {
        try {
            const result = await chrome.storage.local.get({ 'poe2-panel-collapsed': false });
            const isCollapsed = result['poe2-panel-collapsed'];

            console.log('恢复面板状态:', isCollapsed ? '收起' : '展开');

            // 更新toggle按钮图标
            const toggleBtn = document.getElementById('poe2-toggle-btn');
            toggleBtn.innerHTML = isCollapsed ? '►' : '◄';

            if (isCollapsed) {
                historyPanel.classList.add('collapsed');
                document.body.classList.add('poe2-plugin-collapsed');
            } else {
                historyPanel.classList.remove('collapsed');
                document.body.classList.remove('poe2-plugin-collapsed');
            }
        } catch (error) {
            console.error('恢复面板状态失败:', error);
        }
    }

    // 判断是否为默认值
    function isDefaultValue(value) {
        const defaultValues = ['任何', '否', '任何时间', '一口价', '崇高石等价物', '', ' '];
        return defaultValues.includes(value);
    }

    // 从页面select元素中获取物品类型
    function getSelectedItemType() {
        try {
            const selects = document.querySelectorAll('select');
            for (const select of selects) {
                const value = select.value?.trim();
                if (value && value !== '' && !isDefaultValue(value)) {
                    // 检查select的上下文，判断是否为物品类型选择器
                    const parentText = select.parentElement?.textContent || '';
                    const previousText = select.previousElementSibling?.textContent || '';

                    // 如果包含类型相关的文字，或者是页面上方的select
                    if (parentText.includes('类型') || parentText.includes('Type') ||
                        previousText.includes('类型') ||
                        select.getBoundingClientRect().top < 300) {

                        // 优先返回选中选项的文本内容
                        const selectedOption = select.options[select.selectedIndex];
                        if (selectedOption && selectedOption.text && selectedOption.text !== value) {
                            return selectedOption.text.trim();
                        }
                        return value;
                    }
                }
            }
        } catch (e) {
            console.log('获取物品类型时出错:', e);
        }
        return null;
    }

    // 判断是否为无意义的键名
    function isDefaultKey(key) {
        const defaultKeys = ['search_term', '', ' '];
        return defaultKeys.includes(key);
    }

    // 提取搜索参数
    function extractSearchParams() {
        const url = new URL(window.location.href);
        const searchParams = {};

        // 从URL参数中提取搜索条件
        for (const [key, value] of url.searchParams.entries()) {
            if (value && value.trim() !== '') {
                searchParams[key] = value;
            }
        }

        // 针对国服特殊处理URL路径参数
        if (isQQServer && url.pathname.includes('/trade2/search/poe2/')) {
            const pathParts = url.pathname.split('/');
            if (pathParts.length >= 6) {
                const league = decodeURIComponent(pathParts[4]);
                if (league) {
                    searchParams['league'] = league;
                }
                const searchId = pathParts[5];
                if (searchId) {
                    searchParams['search_id'] = searchId;
                }
            }
        }

        // 尝试从页面表单中提取搜索条件
        try {
            const inputs = document.querySelectorAll('input[type="text"], input[type="search"], select, textarea');
            inputs.forEach(input => {
                const value = input.value?.trim();
                if (value && !isDefaultValue(value)) {
                    let key = input.name || input.id || input.placeholder || 'search_term';

                    // 改进key的命名
                    if (input.tagName === 'SELECT') {
                        // 对于select元素，如果key和value相同，说明是类型选择
                        if (key === value) {
                            key = '物品类型';
                        }
                    } else if (input.type === 'text') {
                        // 对于文本输入框，根据placeholder判断用途
                        if (key.includes('查找物品') || key.includes('搜索')) {
                            key = '物品名称';
                        }
                    }

                    // 只保存有意义的搜索参数
                    if (!isDefaultKey(key)) {
                        searchParams[key] = value;
                    }
                }
            });
        } catch (e) {
            console.log('提取表单参数时出错:', e);
        }

        return searchParams;
    }

    // 生成智能标题
    function generateSmartTitle(searchParams) {
        console.log('=== 生成标题调试 ===');
        console.log('搜索参数:', searchParams);

        // 直接从searchParams中提取信息
        for (const [key, value] of Object.entries(searchParams)) {
            if (!value || isDefaultValue(value)) continue;

            console.log(`检查参数: ${key} = ${value}`);

            // 物品名称相关 - 通常是搜索框输入的内容
            if (key === '物品名称' || key.includes('查找物品') || key.includes('搜索') || key.includes('name') || key === 'q') {
                const title = value.trim();
                console.log('找到物品名称，生成标题:', title);
                return title;
            }

            // 物品类型相关 - 从下拉框选择的类型
            if (key === '物品类型' || key.includes('类型') || key.includes('type') || key.includes('category') ||
                // 直接判断是否为装备类型（值和键相同通常表示是类型选择）
                (key === value && value.length <= 10)) {
                const title = value.trim();
                console.log('找到物品类型，生成标题:', title);
                return title;
            }
        }

        // 如果没有找到具体的搜索内容，使用联盟信息
        if (searchParams.league) {
            const title = `${searchParams.league} - 交易搜索`;
            console.log('使用联盟信息生成标题:', title);
            return title;
        }

        // 最后的备选方案
        const title = '交易搜索';
        console.log('使用默认标题:', title);
        return title;
    }

    // 保存搜索记录
    function saveSearchRecord() {
        const searchParams = extractSearchParams();

        if (Object.keys(searchParams).length === 0) {
            return;
        }

        // 使用搜索ID作为记录的唯一标识符
        const recordId = searchParams.search_id || (Date.now() + Math.random().toString(36).substr(2, 9));

        const searchRecord = {
            id: recordId,
            url: window.location.href,
            params: searchParams,
            timestamp: new Date().toISOString(),
            title: generateSmartTitle(searchParams),
            domain: window.location.hostname
        };

        chrome.runtime.sendMessage({
            type: 'SAVE_SEARCH_RECORD',
            data: searchRecord
        }).then(() => {
            console.log('搜索记录已保存:', searchRecord);
            loadSearchHistory(); // 刷新历史记录显示
        }).catch(error => {
            console.log('发送消息失败:', error);
        });
    }

    // 加载搜索历史
    async function loadSearchHistory() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_SEARCH_HISTORY'
            });

            if (response && response.success) {
                searchHistory = response.data || [];
                renderHistory(searchHistory);
            }
        } catch (error) {
            console.error('加载历史记录失败:', error);
        }
    }

    // 渲染历史记录
    function renderHistory(history) {
        const listContainer = document.querySelector('#poe2-history-list');
        if (!listContainer) return;

        if (history.length === 0) {
            listContainer.innerHTML = '<div class="poe2-empty">暂无搜索记录</div>';
            return;
        }

        // 添加统计信息
        const statsHtml = `<div class="poe2-stats">共 ${history.length} 条记录</div>`;

        const historyHtml = history.slice(0, 20).map(record => {
            const time = formatTime(record.timestamp);
            const params = formatParams(record.params);

            return `
                <div class="poe2-history-item" data-url="${record.url}" data-id="${record.id}">
                    <button class="poe2-delete-btn" data-id="${record.id}">×</button>
                    <div class="poe2-item-title">${escapeHtml(record.title)}</div>
                    <div class="poe2-item-time">${time}</div>
                    <div class="poe2-item-params">${params}</div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = statsHtml + historyHtml;

        // 添加点击事件
        addHistoryItemEvents();
    }

    // 格式化参数显示
    function formatParams(params) {
        if (!params || Object.keys(params).length === 0) {
            return '<span class="poe2-param-tag">无搜索条件</span>';
        }

        // 只显示联盟和搜索ID这两个重要参数
        const importantParams = [];
        if (params.league) {
            importantParams.push(['league', params.league]);
        }
        if (params.search_id) {
            importantParams.push(['search_id', params.search_id]);
        }

        if (importantParams.length === 0) {
            return '<span class="poe2-param-tag">基础搜索</span>';
        }

        return importantParams.map(([key, value]) => {
            const displayKey = translateParamKey(key);
            const displayValue = truncateString(value.toString(), 12);
            return `<span class="poe2-param-tag">${displayKey}: ${escapeHtml(displayValue)}</span>`;
        }).join('');
    }

    // 翻译参数键名
    function translateParamKey(key) {
        const translations = {
            'q': '物品',
            'name': '名称',
            'type': '类型',
            'league': '联盟',
            'search_id': 'ID',
            'Search Items...': '搜索',
            'league': '联盟'
        };
        return translations[key] || key;
    }

    // 格式化时间
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) {
            return '刚刚';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}分钟前`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}小时前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    // 添加历史记录项事件
    function addHistoryItemEvents() {
        document.querySelectorAll('.poe2-history-item').forEach(item => {
            item.addEventListener('click', function (e) {
                if (e.target.classList.contains('poe2-delete-btn')) {
                    return;
                }
                const url = this.dataset.url;
                if (url) {
                    // 在当前页面跳转，而不是打开新标签页
                    window.location.href = url;
                }
            });
        });

        document.querySelectorAll('.poe2-delete-btn').forEach(btn => {
            btn.addEventListener('click', async function (e) {
                e.stopPropagation();
                const id = this.dataset.id;
                if (confirm('确定要删除这条记录吗？')) {
                    try {
                        await chrome.runtime.sendMessage({
                            type: 'DELETE_SEARCH_RECORD',
                            id: id
                        });
                        loadSearchHistory();
                    } catch (error) {
                        console.error('删除记录失败:', error);
                    }
                }
            });
        });
    }

    // 过滤历史记录
    function filterHistory() {
        const query = document.querySelector('#poe2-search-input').value.toLowerCase();
        const filteredHistory = searchHistory.filter(record => {
            const title = record.title.toLowerCase();
            const paramsText = Object.values(record.params || {}).join(' ').toLowerCase();
            return title.includes(query) || paramsText.includes(query);
        });
        renderHistory(filteredHistory);
    }

    // 清空搜索历史
    async function clearSearchHistory() {
        const confirmed = await showConfirmDialog(
            '清空搜索历史',
            '确定要清空所有搜索历史吗？此操作不可恢复！',
            '清空',
            '取消'
        );
        if (!confirmed) return;

        try {
            await chrome.runtime.sendMessage({
                type: 'CLEAR_SEARCH_HISTORY'
            });
            loadSearchHistory();
            showToast('搜索历史已清空', 'success');
        } catch (error) {
            console.error('清空历史失败:', error);
            showToast('清空历史失败，请重试', 'error');
        }
    }

    // 工具函数
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function truncateString(str, maxLength) {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    }

    // 监听URL变化
    let currentUrl = window.location.href;
    function checkUrlChange() {
        if (currentUrl !== window.location.href) {
            currentUrl = window.location.href;
            console.log('URL changed:', currentUrl);
            setTimeout(() => {
                if (window.location.href.includes('poe.game.qq.com/trade2/search/poe2')) {
                    saveSearchRecord();
                }
            }, 1000);
        }
    }

    // 初始化
    function init() {
        // 检查是否为国服POE2交易页面
        if (!window.location.href.includes('poe.game.qq.com/trade2/search/poe2')) {
            console.log('不是国服POE2交易页面，跳过插件初始化');
            return;
        }

        console.log('检测到国服POE2交易页面，初始化插件');

        // 等待页面加载完成后创建面板
        setTimeout(() => {
            createHistoryPanel();
            loadSearchHistory();

            // 保存当前搜索记录
            setTimeout(() => {
                saveSearchRecord();
            }, 2000);
        }, 1000);

        // 监听页面变化
        const observer = new MutationObserver(checkUrlChange);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 监听表单提交和搜索操作
        document.addEventListener('submit', function () {
            setTimeout(saveSearchRecord, 500);
        });

        document.addEventListener('click', function (e) {
            if (e.target.matches('button, .btn, [role="button"]') &&
                (e.target.textContent.includes('搜索') || e.target.textContent.includes('Search'))) {
                setTimeout(saveSearchRecord, 500);
            }
        });
    }

    // Tab切换功能
    function switchTab(tabName) {
        const panel = historyPanel;
        if (!panel) return;

        // 更新tab按钮状态
        const tabBtns = panel.querySelectorAll('.poe2-tab-btn');
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 更新tab面板显示
        const tabPanels = panel.querySelectorAll('.poe2-tab-panel');
        tabPanels.forEach(tabPanel => {
            tabPanel.classList.toggle('active', tabPanel.id.includes(tabName));
        });

        // 加载对应数据
        if (tabName === 'history') {
            loadSearchHistory();
        } else if (tabName === 'favorites') {
            loadFavorites();
        }

        console.log('切换到标签页:', tabName);
    }

    // 收藏功能 - 创建文件夹
    async function createFolder() {
        const folderName = await showInputDialog(
            '创建新文件夹',
            '请输入文件夹名称:',
            '新文件夹',
            '请输入文件夹名称'
        );
        if (!folderName) return;

        const folder = {
            id: generateId(),
            name: folderName.trim(),
            type: 'folder',
            created: new Date().toISOString(),
            items: []
        };

        // 保存到存储
        chrome.runtime.sendMessage({
            type: 'SAVE_FAVORITE',
            data: folder
        }, (response) => {
            if (response && response.success) {
                console.log('文件夹创建成功:', folder);
                loadFavorites();
            } else {
                console.error('文件夹创建失败');
                showToast('创建文件夹失败，请重试', 'error');
            }
        });
    }

    // 收藏功能 - 添加当前搜索到收藏
    async function addCurrentSearchToFavorites() {
        const params = extractSearchParams();
        if (!params || Object.keys(params).length === 0) {
            showToast('无法获取当前搜索条件', 'error');
            return;
        }

        const title = generateSmartTitle(params);
        const customTitle = await showInputDialog(
            '添加到收藏',
            '请输入收藏名称:',
            title,
            '请输入收藏名称'
        );
        if (!customTitle) return;

        const favorite = {
            id: generateId(),
            name: customTitle.trim(),
            type: 'favorite',
            url: window.location.href,
            params: params,
            created: new Date().toISOString()
        };

        // 保存到存储
        chrome.runtime.sendMessage({
            type: 'SAVE_FAVORITE',
            data: favorite
        }, (response) => {
            if (response && response.success) {
                console.log('收藏添加成功:', favorite);
                loadFavorites();
                showToast('收藏添加成功！', 'success');
            } else {
                console.error('收藏添加失败');
                showToast('添加收藏失败，请重试', 'error');
            }
        });
    }

    // 加载收藏列表
    function loadFavorites() {
        const favoritesContent = document.getElementById('poe2-favorites-list');
        if (!favoritesContent) return;

        favoritesContent.innerHTML = '<div class="poe2-loading">正在加载收藏...</div>';

        chrome.runtime.sendMessage({ type: 'GET_FAVORITES' }, (response) => {
            if (response && response.success) {
                displayFavorites(response.favorites || []);
            } else {
                favoritesContent.innerHTML = '<div class="poe2-empty">加载收藏失败</div>';
            }
        });
    }

    // 显示收藏列表
    function displayFavorites(favorites) {
        const favoritesContent = document.getElementById('poe2-favorites-list');
        if (!favoritesContent) return;

        if (favorites.length === 0) {
            favoritesContent.innerHTML = '<div class="poe2-empty">暂无收藏</div>';
            return;
        }

        // 分离文件夹和收藏项
        const folders = favorites.filter(item => item.type === 'folder');
        const items = favorites.filter(item => item.type === 'favorite');

        let html = '';

        // 显示文件夹
        folders.forEach(folder => {
            html += `
                <div class="poe2-folder" data-id="${folder.id}">
                    <div class="poe2-folder-header">
                        <div class="poe2-folder-title">
                            📁 ${escapeHtml(folder.name)}
                        </div>
                        <div class="poe2-folder-actions">
                            <button class="poe2-folder-rename-btn" title="重命名文件夹">✏️</button>
                            <button class="poe2-folder-delete-btn" title="删除文件夹">🗑️</button>
                            <div class="poe2-folder-toggle">▼</div>
                        </div>
                    </div>
                    <div class="poe2-folder-content" data-folder-id="${folder.id}">
                        <div class="poe2-folder-toolbar">
                            <button class="poe2-folder-add-btn" data-folder-id="${folder.id}" title="收藏当前搜索到此文件夹">
                                ⭐ 收藏到此文件夹
                            </button>
                        </div>
                        ${folder.items && folder.items.length > 0
                    ? folder.items.map(item => createFavoriteItemHtml(item, true)).join('')
                    : '<div class="poe2-empty">文件夹为空</div>'
                }
                    </div>
                </div>
            `;
        });

        // 显示未分类的收藏项
        if (items.length > 0) {
            html += '<div class="poe2-root-favorites">';
            html += items.map(item => createFavoriteItemHtml(item)).join('');
            html += '</div>';
        }

        favoritesContent.innerHTML = html;

        // 添加事件监听器
        setupFavoritesEvents(favoritesContent);
    }

    // 创建收藏项HTML
    function createFavoriteItemHtml(item, isInFolder = false) {
        return `
            <div class="poe2-favorite-item ${!isInFolder ? 'draggable' : ''}" 
                 data-url="${escapeHtml(item.url)}" 
                 data-id="${item.id}" 
                 ${!isInFolder ? 'draggable="true"' : ''}>
                <div class="poe2-favorite-main">
                    <div class="poe2-favorite-title">${escapeHtml(item.name)}</div>
                </div>
                <div class="poe2-favorite-actions">
                    ${!isInFolder ? '' : '<button class="poe2-favorite-move-btn" title="移动到根目录">📤</button>'}
                    <button class="poe2-favorite-delete-btn" title="删除收藏">🗑️</button>
                </div>
            </div>
        `;
    }

    // 设置收藏功能事件
    function setupFavoritesEvents(container) {
        // 文件夹展开/收起（点击标题区域）
        container.querySelectorAll('.poe2-folder-title').forEach(title => {
            title.addEventListener('click', () => {
                const folder = title.closest('.poe2-folder');
                folder.classList.toggle('collapsed');
            });
        });

        // 文件夹展开/收起（点击箭头）
        container.querySelectorAll('.poe2-folder-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const folder = toggle.closest('.poe2-folder');
                folder.classList.toggle('collapsed');
            });
        });

        // 文件夹重命名按钮
        container.querySelectorAll('.poe2-folder-rename-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folder = btn.closest('.poe2-folder');
                const folderId = folder.dataset.id;
                renameFolderItem(folderId);
            });
        });

        // 文件夹删除按钮
        container.querySelectorAll('.poe2-folder-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folder = btn.closest('.poe2-folder');
                const folderId = folder.dataset.id;
                deleteFolderItem(folderId);
            });
        });

        // 文件夹添加收藏按钮
        container.querySelectorAll('.poe2-folder-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = btn.dataset.folderId;
                addCurrentSearchToFolder(folderId);
            });
        });

        // 收藏项主要区域点击（跳转）
        container.querySelectorAll('.poe2-favorite-main').forEach(main => {
            main.addEventListener('click', () => {
                const item = main.closest('.poe2-favorite-item');
                const url = item.dataset.url;
                if (url) {
                    window.location.href = url;
                }
            });
        });

        // 删除收藏按钮
        container.querySelectorAll('.poe2-favorite-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.poe2-favorite-item');
                const favoriteId = item.dataset.id;
                deleteFavoriteItem(favoriteId);
            });
        });

        // 移动到根目录按钮（只有文件夹内的收藏项才有）
        container.querySelectorAll('.poe2-favorite-move-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.poe2-favorite-item');
                const favoriteId = item.dataset.id;
                moveToRoot(favoriteId);
            });
        });

        // 设置拖拽功能
        setupDragAndDrop(container);
    }

    // 清空收藏
    async function clearFavorites() {
        const confirmed = await showConfirmDialog(
            '清空所有收藏',
            '确定要清空所有收藏吗？包括所有文件夹和收藏项，此操作不可恢复！',
            '清空',
            '取消'
        );
        if (!confirmed) return;

        chrome.runtime.sendMessage({ type: 'CLEAR_FAVORITES' }, (response) => {
            if (response && response.success) {
                console.log('收藏已清空');
                loadFavorites();
            } else {
                console.error('清空收藏失败');
                showToast('清空收藏失败，请重试', 'error');
            }
        });
    }

    // 删除收藏项
    async function deleteFavoriteItem(favoriteId) {
        const confirmed = await showConfirmDialog(
            '删除收藏',
            '确定要删除这个收藏吗？此操作不可恢复。',
            '删除',
            '取消'
        );
        if (!confirmed) return;

        chrome.runtime.sendMessage({
            type: 'DELETE_FAVORITE',
            id: favoriteId
        }, (response) => {
            if (response && response.success) {
                console.log('收藏删除成功:', favoriteId);
                loadFavorites();
                showToast('收藏删除成功', 'success');
            } else {
                console.error('删除收藏失败');
                showToast('删除收藏失败，请重试', 'error');
            }
        });
    }

    // 显示移动到文件夹对话框
    function showMoveToFolderDialog(favoriteId) {
        // 获取当前收藏列表
        chrome.runtime.sendMessage({ type: 'GET_FAVORITES' }, (response) => {
            if (response && response.success) {
                const favorites = response.favorites || [];
                const folders = favorites.filter(item => item.type === 'folder');

                if (folders.length === 0) {
                    showToast('没有可用的文件夹，请先创建文件夹', 'warning');
                    return;
                }

                // 创建选择对话框
                showFolderSelectionDialog(favoriteId, folders);
            } else {
                showToast('获取文件夹列表失败', 'error');
            }
        });
    }

    // 显示文件夹选择对话框
    function showFolderSelectionDialog(favoriteId, folders) {
        // 创建对话框HTML
        const dialogHtml = `
            <div class="poe2-dialog-overlay">
                <div class="poe2-dialog">
                    <div class="poe2-dialog-header">
                        <h3>选择文件夹</h3>
                        <button class="poe2-dialog-close">✕</button>
                    </div>
                    <div class="poe2-dialog-content">
                        <p>请选择要移动到的文件夹：</p>
                        <div class="poe2-folder-list">
                            ${folders.map(folder => `
                                <div class="poe2-folder-option" data-folder-id="${folder.id}">
                                    📁 ${escapeHtml(folder.name)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="poe2-dialog-footer">
                        <button class="poe2-dialog-cancel">取消</button>
                    </div>
                </div>
            </div>
        `;

        // 添加对话框样式
        const dialogStyle = `
            <style>
                .poe2-dialog-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 20000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .poe2-dialog {
                    background: linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(30, 25, 20, 0.95) 100%);
                    border: 2px solid #c9aa71;
                    border-radius: 12px;
                    width: 300px;
                    max-width: 90vw;
                    box-shadow: 0 8px 32px rgba(201, 170, 113, 0.3);
                    font-family: 'Cinzel', 'Times New Roman', serif;
                    color: #f4e4c1;
                }

                .poe2-dialog-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(201, 170, 113, 0.3);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(201, 170, 113, 0.1);
                }

                .poe2-dialog-header h3 {
                    margin: 0;
                    font-size: 16px;
                    color: #ffd700;
                }

                .poe2-dialog-close {
                    background: none;
                    border: none;
                    color: #c9aa71;
                    font-size: 18px;
                    cursor: pointer;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .poe2-dialog-close:hover {
                    background: rgba(220, 53, 69, 0.8);
                    color: #fff;
                }

                .poe2-dialog-content {
                    padding: 20px;
                }

                .poe2-dialog-content p {
                    margin: 0 0 16px 0;
                    font-size: 14px;
                    color: #c9aa71;
                }

                .poe2-folder-list {
                    max-height: 200px;
                    overflow-y: auto;
                }

                .poe2-folder-list::-webkit-scrollbar {
                    width: 4px;
                }

                .poe2-folder-list::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 2px;
                }

                .poe2-folder-list::-webkit-scrollbar-thumb {
                    background: rgba(201, 170, 113, 0.6);
                    border-radius: 2px;
                }

                .poe2-folder-list::-webkit-scrollbar-thumb:hover {
                    background: #ffd700;
                }

                .poe2-folder-option {
                    padding: 12px 16px;
                    margin: 4px 0;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(201, 170, 113, 0.3);
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                }

                .poe2-folder-option:hover {
                    background: rgba(201, 170, 113, 0.2);
                    border-color: #ffd700;
                    transform: translateX(2px);
                }

                .poe2-dialog-footer {
                    padding: 16px 20px;
                    border-top: 1px solid rgba(201, 170, 113, 0.3);
                    text-align: right;
                    background: rgba(0, 0, 0, 0.2);
                }

                .poe2-dialog-cancel {
                    background: rgba(128, 128, 128, 0.6);
                    border: 1px solid #888;
                    color: #fff;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s ease;
                }

                .poe2-dialog-cancel:hover {
                    background: rgba(128, 128, 128, 0.8);
                    transform: translateY(-1px);
                }
            </style>
        `;

        // 添加样式到头部
        document.head.insertAdjacentHTML('beforeend', dialogStyle);

        // 添加对话框到页面
        document.body.insertAdjacentHTML('beforeend', dialogHtml);

        // 设置事件监听器
        const overlay = document.querySelector('.poe2-dialog-overlay');
        const closeBtn = document.querySelector('.poe2-dialog-close');
        const cancelBtn = document.querySelector('.poe2-dialog-cancel');
        const folderOptions = document.querySelectorAll('.poe2-folder-option');

        // 关闭对话框
        const closeDialog = () => {
            overlay.remove();
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDialog();
        });

        // 选择文件夹
        folderOptions.forEach(option => {
            option.addEventListener('click', () => {
                const folderId = option.dataset.folderId;
                moveToFolder(favoriteId, folderId);
                closeDialog();
            });
        });
    }

    // 移动收藏到文件夹
    function moveToFolder(favoriteId, folderId) {
        chrome.runtime.sendMessage({
            type: 'MOVE_TO_FOLDER',
            favoriteId: favoriteId,
            folderId: folderId
        }, (response) => {
            if (response && response.success) {
                console.log('收藏移动成功');
                loadFavorites();
            } else {
                console.error('移动收藏失败');
                showToast('移动收藏失败，请重试', 'error');
            }
        });
    }

    // 删除文件夹
    async function deleteFolderItem(folderId) {
        const confirmed = await showConfirmDialog(
            '删除文件夹',
            '确定要删除这个文件夹吗？文件夹内的所有收藏也会被删除！此操作不可恢复。',
            '删除',
            '取消'
        );
        if (!confirmed) return;

        chrome.runtime.sendMessage({
            type: 'DELETE_FOLDER',
            id: folderId
        }, (response) => {
            if (response && response.success) {
                console.log('文件夹删除成功:', folderId);
                loadFavorites();
            } else {
                console.error('删除文件夹失败');
                showToast('删除文件夹失败，请重试', 'error');
            }
        });
    }

    // 添加当前搜索到指定文件夹
    async function addCurrentSearchToFolder(folderId) {
        const params = extractSearchParams();
        if (!params || Object.keys(params).length === 0) {
            showToast('无法获取当前搜索条件', 'error');
            return;
        }

        const currentUrl = window.location.href;

        try {
            // 检查文件夹中是否已存在相同URL
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ type: 'GET_FAVORITES' }, resolve);
            });

            if (response && response.success) {
                const favorites = response.favorites || [];
                const targetFolder = favorites.find(item => item.id === folderId && item.type === 'folder');

                if (targetFolder && targetFolder.items) {
                    const existingItem = targetFolder.items.find(item => item.url === currentUrl);
                    if (existingItem) {
                        showToast('此文件夹中已存在相同的搜索链接', 'warning');
                        return;
                    }
                }

                // 如果没有重复，继续添加
                const title = generateSmartTitle(params);
                const customTitle = await showInputDialog(
                    '收藏到文件夹',
                    '请输入收藏名称:',
                    title,
                    '请输入收藏名称'
                );
                if (!customTitle) return;

                const favorite = {
                    id: generateId(),
                    name: customTitle.trim(),
                    type: 'favorite',
                    url: currentUrl,
                    params: params,
                    created: new Date().toISOString()
                };

                const addResponse = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        type: 'ADD_TO_FOLDER',
                        favorite: favorite,
                        folderId: folderId
                    }, resolve);
                });

                if (addResponse && addResponse.success) {
                    console.log('收藏添加到文件夹成功:', favorite);
                    loadFavorites();
                    showToast('收藏添加成功！', 'success');
                } else {
                    console.error('添加收藏到文件夹失败');
                    showToast('添加收藏失败，请重试', 'error');
                }
            } else {
                showToast('获取文件夹信息失败', 'error');
            }
        } catch (error) {
            console.error('添加收藏出错:', error);
            showToast('添加收藏失败，请重试', 'error');
        }
    }

    // 重命名文件夹
    async function renameFolderItem(folderId) {
        try {
            // 先获取当前文件夹信息
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ type: 'GET_FAVORITES' }, resolve);
            });

            if (response && response.success) {
                const favorites = response.favorites || [];
                const folder = favorites.find(item => item.id === folderId && item.type === 'folder');

                if (!folder) {
                    showToast('文件夹不存在', 'error');
                    return;
                }

                const newName = await showInputDialog(
                    '重命名文件夹',
                    '请输入新的文件夹名称:',
                    folder.name,
                    '请输入文件夹名称'
                );
                if (!newName || newName === folder.name) return;

                const renameResponse = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        type: 'RENAME_FOLDER',
                        id: folderId,
                        newName: newName.trim()
                    }, resolve);
                });

                if (renameResponse && renameResponse.success) {
                    console.log('文件夹重命名成功:', folderId);
                    loadFavorites();
                    showToast('文件夹重命名成功', 'success');
                } else {
                    console.error('重命名文件夹失败');
                    showToast('重命名文件夹失败，请重试', 'error');
                }
            } else {
                showToast('获取文件夹信息失败', 'error');
            }
        } catch (error) {
            console.error('重命名文件夹出错:', error);
            showToast('重命名文件夹失败，请重试', 'error');
        }
    }

    // 移动收藏到根目录
    function moveToRoot(favoriteId) {
        chrome.runtime.sendMessage({
            type: 'MOVE_TO_ROOT',
            favoriteId: favoriteId
        }, (response) => {
            if (response && response.success) {
                console.log('收藏移动到根目录成功:', favoriteId);
                loadFavorites();
            } else {
                console.error('移动收藏到根目录失败');
                showToast('移动收藏失败，请重试', 'error');
            }
        });
    }

    // 设置拖拽功能
    function setupDragAndDrop(container) {
        let draggedItem = null;

        // 拖拽开始
        container.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('draggable')) {
                draggedItem = e.target;
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.outerHTML);
            }
        });

        // 拖拽结束
        container.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('draggable')) {
                e.target.classList.remove('dragging');
                // 清除所有拖拽样式
                container.querySelectorAll('.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
                draggedItem = null;
            }
        });

        // 拖拽进入文件夹
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const folderContent = e.target.closest('.poe2-folder-content');
            const folder = e.target.closest('.poe2-folder');

            if (folderContent && draggedItem) {
                e.dataTransfer.dropEffect = 'move';
                folderContent.classList.add('drag-over');
                if (folder) folder.classList.add('drag-over');
            }
        });

        // 拖拽离开文件夹
        container.addEventListener('dragleave', (e) => {
            const folderContent = e.target.closest('.poe2-folder-content');
            const folder = e.target.closest('.poe2-folder');

            if (folderContent && !folderContent.contains(e.relatedTarget)) {
                folderContent.classList.remove('drag-over');
                if (folder) folder.classList.remove('drag-over');
            }
        });

        // 拖拽放下
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const folderContent = e.target.closest('.poe2-folder-content');

            if (folderContent && draggedItem) {
                const folderId = folderContent.dataset.folderId;
                const favoriteId = draggedItem.dataset.id;

                if (folderId && favoriteId) {
                    // 移动收藏到文件夹
                    chrome.runtime.sendMessage({
                        type: 'MOVE_TO_FOLDER',
                        favoriteId: favoriteId,
                        folderId: folderId
                    }, (response) => {
                        if (response && response.success) {
                            console.log('拖拽移动成功');
                            loadFavorites();
                        } else {
                            console.error('拖拽移动失败');
                            showToast('移动失败，请重试', 'error');
                        }
                    });
                }
            }

            // 清除拖拽样式
            container.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
        });
    }

    // 自定义确认对话框
    function showConfirmDialog(title, message, confirmText = '确定', cancelText = '取消') {
        return new Promise((resolve) => {
            // 移除现有的对话框
            const existingDialog = document.querySelector('.poe2-input-dialog-overlay');
            if (existingDialog) {
                existingDialog.remove();
            }

            // 创建对话框HTML
            const dialogHtml = `
                <div class="poe2-input-dialog-overlay">
                    <div class="poe2-input-dialog">
                        <div class="poe2-input-dialog-header">
                            <h3 class="poe2-input-dialog-title">${escapeHtml(title)}</h3>
                        </div>
                        <div class="poe2-input-dialog-content">
                            <p style="margin: 0; font-size: 14px; color: #c9aa71; line-height: 1.5;">
                                ${escapeHtml(message)}
                            </p>
                        </div>
                        <div class="poe2-input-dialog-footer">
                            <button class="poe2-input-dialog-btn poe2-input-dialog-btn-secondary">${escapeHtml(cancelText)}</button>
                            <button class="poe2-input-dialog-btn poe2-input-dialog-btn-primary">${escapeHtml(confirmText)}</button>
                        </div>
                    </div>
                </div>
            `;

            // 添加到页面
            document.body.insertAdjacentHTML('beforeend', dialogHtml);

            const overlay = document.querySelector('.poe2-input-dialog-overlay');
            const cancelBtn = overlay.querySelector('.poe2-input-dialog-btn-secondary');
            const confirmBtn = overlay.querySelector('.poe2-input-dialog-btn-primary');

            // 关闭对话框
            const closeDialog = (result = false) => {
                overlay.remove();
                resolve(result);
            };

            // 事件监听器
            cancelBtn.addEventListener('click', () => closeDialog(false));
            confirmBtn.addEventListener('click', () => closeDialog(true));

            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeDialog(false);
            });

            // 键盘事件
            document.addEventListener('keydown', function escapeHandler(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escapeHandler);
                    closeDialog(false);
                } else if (e.key === 'Enter') {
                    document.removeEventListener('keydown', escapeHandler);
                    closeDialog(true);
                }
            });

            // 自动聚焦确认按钮
            setTimeout(() => {
                confirmBtn.focus();
            }, 100);
        });
    }

    // 自定义输入对话框
    function showInputDialog(title, label, defaultValue = '', placeholder = '') {
        return new Promise((resolve) => {
            // 移除现有的对话框
            const existingDialog = document.querySelector('.poe2-input-dialog-overlay');
            if (existingDialog) {
                existingDialog.remove();
            }

            // 创建对话框HTML
            const dialogHtml = `
                <div class="poe2-input-dialog-overlay">
                    <div class="poe2-input-dialog">
                        <div class="poe2-input-dialog-header">
                            <h3 class="poe2-input-dialog-title">${escapeHtml(title)}</h3>
                        </div>
                        <div class="poe2-input-dialog-content">
                            <label class="poe2-input-dialog-label">${escapeHtml(label)}</label>
                            <input type="text" class="poe2-input-dialog-input" 
                                   value="${escapeHtml(defaultValue)}" 
                                   placeholder="${escapeHtml(placeholder)}">
                        </div>
                        <div class="poe2-input-dialog-footer">
                            <button class="poe2-input-dialog-btn poe2-input-dialog-btn-secondary">取消</button>
                            <button class="poe2-input-dialog-btn poe2-input-dialog-btn-primary">确定</button>
                        </div>
                    </div>
                </div>
            `;

            // 添加到页面
            document.body.insertAdjacentHTML('beforeend', dialogHtml);

            const overlay = document.querySelector('.poe2-input-dialog-overlay');
            const input = overlay.querySelector('.poe2-input-dialog-input');
            const cancelBtn = overlay.querySelector('.poe2-input-dialog-btn-secondary');
            const confirmBtn = overlay.querySelector('.poe2-input-dialog-btn-primary');

            // 关闭对话框
            const closeDialog = (result = null) => {
                overlay.remove();
                resolve(result);
            };

            // 事件监听器
            cancelBtn.addEventListener('click', () => closeDialog(null));

            confirmBtn.addEventListener('click', () => {
                const value = input.value.trim();
                closeDialog(value || null);
            });

            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeDialog(null);
            });

            // 键盘事件
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const value = input.value.trim();
                    closeDialog(value || null);
                } else if (e.key === 'Escape') {
                    closeDialog(null);
                }
            });

            // 自动聚焦并选中文本
            setTimeout(() => {
                input.focus();
                if (defaultValue) {
                    input.select();
                }
            }, 100);
        });
    }

    // 显示Toast提示
    function showToast(message, type = 'info', duration = 3000) {
        // 移除现有的toast
        const existingToast = document.querySelector('.poe2-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `poe2-toast ${type}`;

        // 设置图标
        let icon = '💬';
        switch (type) {
            case 'success':
                icon = '✅';
                break;
            case 'warning':
                icon = '⚠️';
                break;
            case 'error':
                icon = '❌';
                break;
        }

        toast.innerHTML = `
            <span class="poe2-toast-icon">${icon}</span>
            ${message}
        `;

        // 添加到页面
        document.body.appendChild(toast);

        // 显示动画
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // 自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    // 生成唯一ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 监听来自background的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'TOGGLE_HISTORY_PANEL') {
            if (historyPanel) {
                togglePanel();
            } else {
                createHistoryPanel();
                loadSearchHistory();
            }
            sendResponse({ success: true });
        }
    });

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();