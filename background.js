// POE 交易市场助手后台脚本
// 导入LZ-String压缩库
importScripts('lib/lz-string.js');

chrome.runtime.onInstalled.addListener(() => {
    console.log('POE 交易市场助手已安装');
});

// 获取存储键名（根据版本）
function getStorageKey(version, key) {
    const versionPrefix = version === 'poe1' ? 'poe1' : 'poe2';
    return `${versionPrefix}-${key}`;
}

// 处理插件图标点击
chrome.action.onClicked.addListener((tab) => {
    // 如果当前页面是交易页面，发送消息给content script来切换面板
    if (tab.url && (tab.url.includes('/trade') || tab.url.includes('/trade2'))) {
        chrome.tabs.sendMessage(tab.id, {
            type: 'TOGGLE_HISTORY_PANEL'
        }).catch(error => {
            console.log('发送消息失败:', error);
        });
    } else {
        // 如果不是交易页面，打开交易页面
        const tradeUrl = tab.url && tab.url.includes('poe.game.qq.com')
            ? 'https://poe.game.qq.com/trade2'
            : 'https://www.pathofexile.com/trade';
        chrome.tabs.create({ url: tradeUrl });
    }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('🔧 Background收到消息:', request.type);

    const version = request.version || 'poe2'; // 默认 poe2 向后兼容

    if (request.type === 'SAVE_SEARCH_RECORD') {
        console.log('💾 开始保存搜索记录:', request.data);
        saveSearchRecord(request.data, version).then(() => {
            console.log('✅ 搜索记录保存成功');
            sendResponse({ success: true });
        }).catch(error => {
            console.error('❌ 搜索记录保存失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // 保持消息通道开放
    } else if (request.type === 'GET_SEARCH_HISTORY') {
        console.log('📚 获取搜索历史');
        getSearchHistory(version).then(history => {
            console.log('✅ 获取到历史记录:', history.length, '条');
            sendResponse({ success: true, data: history });
        }).catch(error => {
            console.error('❌ 获取历史记录失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // 保持消息通道开放
    } else if (request.type === 'DELETE_SEARCH_RECORD') {
        deleteSearchRecord(request.id, version).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.type === 'CLEAR_SEARCH_HISTORY') {
        clearSearchHistory(version).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.type === 'SAVE_FAVORITE') {
        console.log('💾 开始保存收藏:', request.data);
        saveFavorite(request.data, version).then(() => {
            console.log('✅ 收藏保存成功');
            sendResponse({ success: true });
        }).catch(error => {
            console.error('❌ 收藏保存失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.type === 'GET_FAVORITES') {
        console.log('📚 获取收藏列表');
        getFavorites(version).then(favorites => {
            console.log('✅ 获取到收藏:', favorites.length, '条');
            sendResponse({ success: true, favorites: favorites });
        }).catch(error => {
            console.error('❌ 获取收藏失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.type === 'DELETE_FAVORITE') {
        deleteFavorite(request.id, version).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.type === 'CLEAR_FAVORITES') {
        clearFavorites(version).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.type === 'MOVE_TO_FOLDER') {
        console.log('📁 移动收藏到文件夹:', request.favoriteId, '->', request.folderId);
        moveToFolder(request.favoriteId, request.folderId, version).then(() => {
            console.log('✅ 收藏移动成功');
            sendResponse({ success: true });
        }).catch(error => {
            console.error('❌ 移动收藏失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.type === 'DELETE_FOLDER') {
        console.log('🗑️ 删除文件夹:', request.id);
        deleteFolderItem(request.id, version).then(() => {
            console.log('✅ 文件夹删除成功');
            sendResponse({ success: true });
        }).catch(error => {
            console.error('❌ 删除文件夹失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.type === 'ADD_TO_FOLDER') {
        console.log('⭐ 添加收藏到文件夹:', request.favorite.name, '->', request.folderId);
        addToFolder(request.favorite, request.folderId, version).then(() => {
            console.log('✅ 收藏添加到文件夹成功');
            sendResponse({ success: true });
        }).catch(error => {
            console.error('❌ 添加收藏到文件夹失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.type === 'RENAME_FOLDER') {
        console.log('✏️ 重命名文件夹:', request.id, '->', request.newName);
        renameFolderItem(request.id, request.newName, version).then(() => {
            console.log('✅ 文件夹重命名成功');
            sendResponse({ success: true });
        }).catch(error => {
            console.error('❌ 重命名文件夹失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.type === 'MOVE_TO_ROOT') {
        console.log('📤 移动收藏到根目录:', request.favoriteId);
        moveToRoot(request.favoriteId, version).then(() => {
            console.log('✅ 收藏移动到根目录成功');
            sendResponse({ success: true });
        }).catch(error => {
            console.error('❌ 移动收藏到根目录失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.type === 'EXPORT_FOLDER') {
        console.log('📤 导出文件夹:', request.folderId);
        exportFolder(request.folderId, version).then((exportData) => {
            console.log('✅ 文件夹导出成功');
            sendResponse({ success: true, data: exportData });
        }).catch(error => {
            console.error('❌ 文件夹导出失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.type === 'IMPORT_FOLDER') {
        console.log('📥 导入文件夹:', request.importData);
        importFolder(request.importData, version).then((result) => {
            console.log('✅ 文件夹导入成功');
            sendResponse({ success: true, data: result });
        }).catch(error => {
            console.error('❌ 文件夹导入失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
});

// 保存搜索记录
async function saveSearchRecord(record, version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'searchHistory');
        // 获取现有的搜索历史
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        let searchHistory = result[storageKey];

        // 按ID去重：如果存在相同ID的记录，删除旧的
        const existingIndex = searchHistory.findIndex(existing => existing.id === record.id);
        if (existingIndex !== -1) {
            console.log('发现相同ID的记录，删除旧记录:', searchHistory[existingIndex]);
            searchHistory.splice(existingIndex, 1);
        }

        // 添加新记录到数组开头
        searchHistory.unshift(record);

        // 限制历史记录数量（最多保存100条）
        if (searchHistory.length > 100) {
            searchHistory = searchHistory.slice(0, 100);
        }

        // 保存到存储
        await chrome.storage.local.set({ [storageKey]: searchHistory });
        console.log('搜索记录已保存:', record);
    } catch (error) {
        console.error('保存搜索记录失败:', error);
    }
}

// 获取搜索历史
async function getSearchHistory(version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'searchHistory');
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        return result[storageKey];
    } catch (error) {
        console.error('获取搜索历史失败:', error);
        return [];
    }
}

// 删除搜索记录
async function deleteSearchRecord(recordId, version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'searchHistory');
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        const searchHistory = result[storageKey].filter(record => record.id !== recordId);
        await chrome.storage.local.set({ [storageKey]: searchHistory });
        console.log('搜索记录已删除:', recordId);
    } catch (error) {
        console.error('删除搜索记录失败:', error);
    }
}

// 清空搜索历史
async function clearSearchHistory(version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'searchHistory');
        await chrome.storage.local.set({ [storageKey]: [] });
        console.log('搜索历史已清空');
    } catch (error) {
        console.error('清空搜索历史失败:', error);
    }
}

// 定期清理旧记录（保留最近30天的记录）
function cleanupOldRecords() {
    // 清理 POE1 和 POE2 的记录
    ['poe1', 'poe2'].forEach(version => {
        const storageKey = getStorageKey(version, 'searchHistory');
        chrome.storage.local.get({ [storageKey]: [] }, (result) => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const searchHistory = result[storageKey];
            const filteredHistory = searchHistory.filter(record => {
                return new Date(record.timestamp) > thirtyDaysAgo;
            });

            if (filteredHistory.length !== searchHistory.length) {
                chrome.storage.local.set({ [storageKey]: filteredHistory });
                console.log(`已清理过期的${version}搜索记录`);
            }
        });
    });
}

// 每天清理一次旧记录
chrome.alarms.create('cleanupOldRecords', { delayInMinutes: 1, periodInMinutes: 24 * 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanupOldRecords') {
        cleanupOldRecords();
    }
});

// 收藏功能

// 保存收藏
async function saveFavorite(favorite, version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'favorites');
        // 获取现有的收藏列表
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        let favorites = result[storageKey];

        // 按ID去重：如果存在相同ID的记录，删除旧的
        const existingIndex = favorites.findIndex(existing => existing.id === favorite.id);
        if (existingIndex !== -1) {
            console.log('发现相同ID的收藏，删除旧记录:', favorites[existingIndex]);
            favorites.splice(existingIndex, 1);
        }

        // 添加新收藏到数组开头
        favorites.unshift(favorite);

        // 限制收藏数量（最多保存200条）
        if (favorites.length > 200) {
            favorites = favorites.slice(0, 200);
        }

        // 保存到存储
        await chrome.storage.local.set({ [storageKey]: favorites });
        console.log('收藏已保存:', favorite);
    } catch (error) {
        console.error('保存收藏失败:', error);
        throw error;
    }
}

// 获取收藏列表
async function getFavorites(version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'favorites');
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        return result[storageKey];
    } catch (error) {
        console.error('获取收藏列表失败:', error);
        return [];
    }
}

// 删除收藏
async function deleteFavorite(favoriteId, version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'favorites');
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        let favorites = result[storageKey];
        let found = false;

        // 首先尝试从根节点删除
        const originalLength = favorites.length;
        favorites = favorites.filter(favorite => favorite.id !== favoriteId);

        if (favorites.length < originalLength) {
            found = true;
        } else {
            // 如果根节点没有找到，从文件夹中查找并删除
            for (let i = 0; i < favorites.length; i++) {
                if (favorites[i].type === 'folder' && favorites[i].items) {
                    const originalItemsLength = favorites[i].items.length;
                    favorites[i].items = favorites[i].items.filter(item => item.id !== favoriteId);

                    if (favorites[i].items.length < originalItemsLength) {
                        found = true;
                        break;
                    }
                }
            }
        }

        if (!found) {
            throw new Error('收藏项不存在');
        }

        await chrome.storage.local.set({ [storageKey]: favorites });
        console.log('收藏已删除:', favoriteId);
    } catch (error) {
        console.error('删除收藏失败:', error);
        throw error;
    }
}

// 清空收藏
async function clearFavorites(version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'favorites');
        await chrome.storage.local.set({ [storageKey]: [] });
        console.log('收藏列表已清空');
    } catch (error) {
        console.error('清空收藏失败:', error);
        throw error;
    }
}

// 移动收藏到文件夹
async function moveToFolder(favoriteId, folderId, version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'favorites');
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        let favorites = result[storageKey];

        // 找到要移动的收藏项
        const favoriteIndex = favorites.findIndex(item => item.id === favoriteId);
        if (favoriteIndex === -1) {
            throw new Error('收藏项不存在');
        }

        // 找到目标文件夹
        const folderIndex = favorites.findIndex(item => item.id === folderId && item.type === 'folder');
        if (folderIndex === -1) {
            throw new Error('目标文件夹不存在');
        }

        // 获取收藏项和文件夹
        const favoriteItem = favorites[favoriteIndex];
        const targetFolder = favorites[folderIndex];

        // 确保文件夹有items数组
        if (!targetFolder.items) {
            targetFolder.items = [];
        }

        // 检查收藏项是否已经在文件夹中
        const existingIndex = targetFolder.items.findIndex(item => item.id === favoriteId);
        if (existingIndex !== -1) {
            console.log('收藏项已经在目标文件夹中');
            return;
        }

        // 将收藏项添加到文件夹
        targetFolder.items.unshift(favoriteItem);

        // 从原位置删除收藏项
        favorites.splice(favoriteIndex, 1);

        // 保存更新后的数据
        await chrome.storage.local.set({ [storageKey]: favorites });
        console.log('收藏项已移动到文件夹:', favoriteItem.name, '->', targetFolder.name);
    } catch (error) {
        console.error('移动收藏到文件夹失败:', error);
        throw error;
    }
}

// 删除文件夹
async function deleteFolderItem(folderId, version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'favorites');
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        let favorites = result[storageKey];

        // 找到要删除的文件夹
        const folderIndex = favorites.findIndex(item => item.id === folderId && item.type === 'folder');
        if (folderIndex === -1) {
            throw new Error('文件夹不存在');
        }

        // 删除文件夹
        const deletedFolder = favorites.splice(folderIndex, 1)[0];

        // 保存更新后的数据
        await chrome.storage.local.set({ [storageKey]: favorites });
        console.log('文件夹已删除:', deletedFolder.name, '包含', deletedFolder.items?.length || 0, '个收藏项');
    } catch (error) {
        console.error('删除文件夹失败:', error);
        throw error;
    }
}

// 添加收藏到文件夹
async function addToFolder(favorite, folderId, version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'favorites');
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        let favorites = result[storageKey];

        // 找到目标文件夹
        const folderIndex = favorites.findIndex(item => item.id === folderId && item.type === 'folder');
        if (folderIndex === -1) {
            throw new Error('目标文件夹不存在');
        }

        const targetFolder = favorites[folderIndex];

        // 确保文件夹有items数组
        if (!targetFolder.items) {
            targetFolder.items = [];
        }

        // 检查收藏项是否已经在文件夹中
        const existingIndex = targetFolder.items.findIndex(item => item.id === favorite.id);
        if (existingIndex !== -1) {
            console.log('收藏项已经在目标文件夹中');
            return;
        }

        // 将收藏项添加到文件夹
        targetFolder.items.unshift(favorite);

        // 保存更新后的数据
        await chrome.storage.local.set({ [storageKey]: favorites });
        console.log('收藏项已添加到文件夹:', favorite.name, '->', targetFolder.name);
    } catch (error) {
        console.error('添加收藏到文件夹失败:', error);
        throw error;
    }
}

// 重命名文件夹
async function renameFolderItem(folderId, newName, version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'favorites');
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        let favorites = result[storageKey];

        // 找到要重命名的文件夹
        const folderIndex = favorites.findIndex(item => item.id === folderId && item.type === 'folder');
        if (folderIndex === -1) {
            throw new Error('文件夹不存在');
        }

        // 更新文件夹名称
        const oldName = favorites[folderIndex].name;
        favorites[folderIndex].name = newName;

        // 保存更新后的数据
        await chrome.storage.local.set({ [storageKey]: favorites });
        console.log('文件夹已重命名:', oldName, '->', newName);
    } catch (error) {
        console.error('重命名文件夹失败:', error);
        throw error;
    }
}

// 移动收藏到根目录
async function moveToRoot(favoriteId, version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'favorites');
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        let favorites = result[storageKey];

        // 在所有文件夹中查找并移除该收藏项
        let favoriteItem = null;
        let foundInFolder = false;

        for (let i = 0; i < favorites.length; i++) {
            if (favorites[i].type === 'folder' && favorites[i].items) {
                const itemIndex = favorites[i].items.findIndex(item => item.id === favoriteId);
                if (itemIndex !== -1) {
                    favoriteItem = favorites[i].items.splice(itemIndex, 1)[0];
                    foundInFolder = true;
                    break;
                }
            }
        }

        if (!foundInFolder || !favoriteItem) {
            throw new Error('收藏项不存在或不在文件夹中');
        }

        // 将收藏项添加到根目录
        favorites.unshift(favoriteItem);

        // 保存更新后的数据
        await chrome.storage.local.set({ [storageKey]: favorites });
        console.log('收藏项已移动到根目录:', favoriteItem.name);
    } catch (error) {
        console.error('移动收藏到根目录失败:', error);
        throw error;
    }
}

// 导出文件夹
async function exportFolder(folderId, version = 'poe2') {
    try {
        const storageKey = getStorageKey(version, 'favorites');
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        const favorites = result[storageKey];

        // 找到要导出的文件夹
        const folder = favorites.find(item => item.id === folderId && item.type === 'folder');
        if (!folder) {
            throw new Error('文件夹不存在');
        }

        // 创建导出数据
        const exportData = {
            version: '1.0.0',
            type: 'poe2-trading-folder',
            timestamp: Date.now(),
            folder: {
                name: folder.name,
                items: folder.items || [],
                exportedAt: new Date().toISOString(),
                totalItems: (folder.items || []).length
            }
        };

        // 转换为JSON字符串
        const jsonString = JSON.stringify(exportData);
        console.log('原始JSON大小:', jsonString.length, '字符');

        // 使用LZ-String压缩
        const compressed = LZString.compressToBase64(jsonString);
        console.log('压缩后大小:', compressed.length, '字符');
        console.log('压缩率:', ((1 - compressed.length / jsonString.length) * 100).toFixed(1) + '%');

        return {
            compressed: compressed,
            originalSize: jsonString.length,
            compressedSize: compressed.length,
            compressionRatio: ((1 - compressed.length / jsonString.length) * 100).toFixed(1),
            folderName: folder.name,
            itemCount: (folder.items || []).length
        };
    } catch (error) {
        console.error('导出文件夹失败:', error);
        throw error;
    }
}

// 导入文件夹
async function importFolder(importData, version = 'poe2') {
    try {
        console.log('开始导入，数据长度:', importData.length);

        // 解压缩数据
        const decompressed = LZString.decompressFromBase64(importData);
        if (!decompressed) {
            throw new Error('数据解压缩失败，请检查导入数据是否正确');
        }

        // 解析JSON
        let parsedData;
        try {
            parsedData = JSON.parse(decompressed);
        } catch (e) {
            throw new Error('数据格式不正确，无法解析JSON');
        }

        // 验证数据格式
        if (!parsedData.type || parsedData.type !== 'poe2-trading-folder') {
            throw new Error('不是有效的POE2交易助手文件夹导出数据');
        }

        if (!parsedData.folder || !parsedData.folder.name) {
            throw new Error('导入数据缺少文件夹信息');
        }

        // 获取当前收藏数据
        const storageKey = getStorageKey(version, 'favorites');
        const result = await chrome.storage.local.get({ [storageKey]: [] });
        let favorites = result[storageKey];

        // 检查是否存在同名文件夹
        const existingFolderIndex = favorites.findIndex(item =>
            item.type === 'folder' && item.name === parsedData.folder.name
        );

        let targetFolder;
        if (existingFolderIndex !== -1) {
            // 如果存在同名文件夹，合并到现有文件夹
            targetFolder = favorites[existingFolderIndex];
            console.log('发现同名文件夹，将合并导入');
        } else {
            // 创建新文件夹
            targetFolder = {
                id: Date.now() + 'folder' + Math.random().toString(36).substr(2, 9),
                type: 'folder',
                name: parsedData.folder.name,
                items: [],
                createdAt: new Date().toISOString()
            };
            favorites.unshift(targetFolder);
            console.log('创建新文件夹:', targetFolder.name);
        }

        // 处理导入的收藏项
        const importedItems = parsedData.folder.items || [];
        let newItemsCount = 0;
        let duplicatesCount = 0;

        for (const item of importedItems) {
            // 检查是否已存在相同URL的收藏项
            const existingItem = targetFolder.items.find(existing => existing.url === item.url);
            if (!existingItem) {
                // 生成新的ID并添加到文件夹
                const newItem = {
                    ...item,
                    id: Date.now() + 'fav' + Math.random().toString(36).substr(2, 9),
                    importedAt: new Date().toISOString()
                };
                targetFolder.items.push(newItem);
                newItemsCount++;
            } else {
                duplicatesCount++;
                console.log('跳过重复项:', item.name);
            }
        }

        // 保存更新后的数据
        await chrome.storage.local.set({ [storageKey]: favorites });

        return {
            success: true,
            folderName: parsedData.folder.name,
            totalItems: importedItems.length,
            newItems: newItemsCount,
            duplicates: duplicatesCount,
            isNewFolder: existingFolderIndex === -1
        };
    } catch (error) {
        console.error('导入文件夹失败:', error);
        throw error;
    }
}
