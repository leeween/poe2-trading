// POE2 交易市场助手弹出页面脚本
document.addEventListener('DOMContentLoaded', function () {
    const historyContainer = document.getElementById('historyContainer');
    const searchInput = document.getElementById('searchInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statsContainer = document.getElementById('statsContainer');

    let allHistory = [];
    let filteredHistory = [];

    // 初始化
    init();

    async function init() {
        await loadHistory();
        setupEventListeners();
    }

    // 设置事件监听器
    function setupEventListeners() {
        // 搜索输入框
        searchInput.addEventListener('input', handleSearch);

        // 刷新按钮
        refreshBtn.addEventListener('click', loadHistory);

        // 清空按钮
        clearBtn.addEventListener('click', handleClearHistory);
    }

    // 加载搜索历史
    async function loadHistory() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_SEARCH_HISTORY'
            });

            if (response.success) {
                allHistory = response.data || [];
                filteredHistory = [...allHistory];
                renderHistory();
                updateStats();
            }
        } catch (error) {
            console.error('加载历史记录失败:', error);
            showError('加载历史记录失败');
        }
    }

    // 渲染历史记录
    function renderHistory() {
        if (filteredHistory.length === 0) {
            showEmptyState();
            return;
        }

        const html = filteredHistory.map(record => createHistoryItemHTML(record)).join('');
        historyContainer.innerHTML = html;

        // 添加事件监听器
        addHistoryItemListeners();
    }

    // 创建历史记录项HTML
    function createHistoryItemHTML(record) {
        const time = formatTime(record.timestamp);
        const title = record.title || '交易搜索';
        const params = formatParams(record.params);

        return `
            <div class="history-item" data-id="${record.id}" data-url="${record.url}">
                <button class="delete-btn" data-id="${record.id}" title="删除此记录">×</button>
                <div class="item-title">${escapeHtml(title)}</div>
                <div class="item-time">${time}</div>
                <div class="item-params">${params}</div>
            </div>
        `;
    }

    // 格式化搜索参数
    function formatParams(params) {
        if (!params || Object.keys(params).length === 0) {
            return '<span class="param-item">无搜索条件</span>';
        }

        return Object.entries(params)
            .filter(([key, value]) => value && value.toString().trim() !== '')
            .map(([key, value]) => {
                const displayKey = translateParamKey(key);
                const displayValue = truncateString(value.toString(), 20);
                return `<span class="param-item">${displayKey}: ${escapeHtml(displayValue)}</span>`;
            })
            .join('');
    }

    // 翻译参数键名
    function translateParamKey(key) {
        const translations = {
            'q': '物品名称',
            'name': '名称',
            'type': '类型',
            'base': '基底',
            'rarity': '稀有度',
            'level': '等级',
            'quality': '品质',
            'sockets': '插槽',
            'links': '连接',
            'corrupted': '腐蚀',
            'enchant': '附魔',
            'crafted': '工艺',
            'identified': '已鉴定',
            'league': '联盟',
            'realm': '服务器',
            'seller': '卖家',
            'price': '价格',
            'currency': '货币',
            'search_id': '搜索ID',
            'item_name': '物品名称',
            'filter': '筛选条件',
            '物品名称': '物品名称',
            '输入物品名称': '物品名称'
        };

        return translations[key] || key;
    }

    // 格式化时间
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) { // 1分钟内
            return '刚刚';
        } else if (diff < 3600000) { // 1小时内
            return `${Math.floor(diff / 60000)}分钟前`;
        } else if (diff < 86400000) { // 1天内
            return `${Math.floor(diff / 3600000)}小时前`;
        } else if (diff < 604800000) { // 1周内
            return `${Math.floor(diff / 86400000)}天前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    // 添加历史记录项事件监听器
    function addHistoryItemListeners() {
        // 点击历史记录项打开链接
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', function (e) {
                if (e.target.classList.contains('delete-btn')) {
                    return; // 忽略删除按钮的点击
                }

                const url = this.dataset.url;
                if (url) {
                    chrome.tabs.create({ url });
                    window.close();
                }
            });
        });

        // 删除按钮
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const id = this.dataset.id;
                handleDeleteRecord(id);
            });
        });
    }

    // 处理搜索
    function handleSearch() {
        const query = searchInput.value.toLowerCase().trim();

        if (!query) {
            filteredHistory = [...allHistory];
        } else {
            filteredHistory = allHistory.filter(record => {
                const title = (record.title || '').toLowerCase();
                const paramsText = Object.values(record.params || {}).join(' ').toLowerCase();
                return title.includes(query) || paramsText.includes(query);
            });
        }

        renderHistory();
        updateStats();
    }

    // 处理删除记录
    async function handleDeleteRecord(recordId) {
        if (!confirm('确定要删除这条搜索记录吗？')) {
            return;
        }

        try {
            await chrome.runtime.sendMessage({
                type: 'DELETE_SEARCH_RECORD',
                id: recordId
            });

            // 从本地数组中移除
            allHistory = allHistory.filter(record => record.id !== recordId);
            filteredHistory = filteredHistory.filter(record => record.id !== recordId);

            renderHistory();
            updateStats();
        } catch (error) {
            console.error('删除记录失败:', error);
            alert('删除记录失败');
        }
    }

    // 处理清空历史
    async function handleClearHistory() {
        if (!confirm('确定要清空所有搜索历史吗？此操作不可恢复。')) {
            return;
        }

        try {
            await chrome.runtime.sendMessage({
                type: 'CLEAR_SEARCH_HISTORY'
            });

            allHistory = [];
            filteredHistory = [];
            renderHistory();
            updateStats();
        } catch (error) {
            console.error('清空历史失败:', error);
            alert('清空历史失败');
        }
    }

    // 显示空状态
    function showEmptyState() {
        historyContainer.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                <div>暂无搜索记录</div>
                <div style="font-size: 11px; color: #666; margin-top: 10px;">
                    在POE2交易市场进行搜索后，记录会显示在这里
                </div>
            </div>
        `;
    }

    // 显示错误
    function showError(message) {
        historyContainer.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                <div>${message}</div>
            </div>
        `;
    }

    // 更新统计信息
    function updateStats() {
        const total = allHistory.length;
        const filtered = filteredHistory.length;

        if (total === 0) {
            statsContainer.textContent = '暂无搜索记录';
        } else if (filtered === total) {
            statsContainer.textContent = `共 ${total} 条搜索记录`;
        } else {
            statsContainer.textContent = `显示 ${filtered} / ${total} 条记录`;
        }
    }

    // 工具函数
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function truncateString(str, maxLength) {
        if (str.length <= maxLength) {
            return str;
        }
        return str.substring(0, maxLength) + '...';
    }
});
