// Dashboard JavaScript Application
class Dashboard {
    constructor() {
        this.activityChart = null;
        this.responseChart = null;
        this.refreshInterval = null;
        this.init();
    }

    init() {
        this.initCharts();
        this.startAutoRefresh();
        this.refreshStats();
        this.refreshLogs();
        
        // Set initial timestamps
        document.getElementById('start-time').textContent = new Date().toLocaleString();
        document.getElementById('node-version').textContent = 'Unknown';
        document.getElementById('memory-usage').textContent = 'Unknown';
    }

    initCharts() {
        // Activity Chart
        const activityCtx = document.getElementById('activityChart').getContext('2d');
        this.activityChart = new Chart(activityCtx, {
            type: 'line',
            data: {
                labels: this.getLast24Hours(),
                datasets: [{
                    label: 'Messages Received',
                    data: new Array(24).fill(0),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Messages Replied',
                    data: new Array(24).fill(0),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Response Chart (Doughnut)
        const responseCtx = document.getElementById('responseChart').getContext('2d');
        this.responseChart = new Chart(responseCtx, {
            type: 'doughnut',
            data: {
                labels: ['Successful Replies', 'Failed/Skipped'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    getLast24Hours() {
        const labels = [];
        for (let i = 23; i >= 0; i--) {
            const hour = new Date();
            hour.setHours(hour.getHours() - i);
            labels.push(hour.getHours().toString().padStart(2, '0') + ':00');
        }
        return labels;
    }

    async refreshStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();

            // Update status indicators
            this.updateConnectionStatus(data.isConnected);
            
            // Update statistics cards
            document.getElementById('messages-received').textContent = data.messagesReceived || 0;
            document.getElementById('messages-replied').textContent = data.messagesReplied || 0;
            document.getElementById('uptime').textContent = this.formatUptime(data.uptime || 0);
            
            const lastActivity = data.lastActivity ? 
                this.formatRelativeTime(data.lastActivity) : 'Never';
            document.getElementById('last-activity').textContent = lastActivity;

            // Update charts with mock data (in a real implementation, you'd get this from the API)
            this.updateCharts(data);

        } catch (error) {
            console.error('Failed to refresh stats:', error);
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(isConnected) {
        const statusElement = document.getElementById('connection-status');
        
        if (isConnected) {
            statusElement.className = 'badge bg-success';
            statusElement.innerHTML = '<i class="fas fa-circle me-1"></i>Connected';
        } else {
            statusElement.className = 'badge bg-danger';
            statusElement.innerHTML = '<i class="fas fa-circle me-1"></i>Disconnected';
        }
    }

    updateCharts(data) {
        // Update activity chart with random data for demonstration
        // In a real implementation, you'd get hourly data from the backend
        const receivedData = new Array(24).fill(0).map(() => Math.floor(Math.random() * 10));
        const repliedData = new Array(24).fill(0).map(() => Math.floor(Math.random() * 8));

        this.activityChart.data.datasets[0].data = receivedData;
        this.activityChart.data.datasets[1].data = repliedData;
        this.activityChart.update();

        // Update response chart
        const successRate = data.messagesReplied || 0;
        const failureRate = (data.messagesReceived || 0) - successRate;
        
        this.responseChart.data.datasets[0].data = [successRate, Math.max(0, failureRate)];
        this.responseChart.update();
    }

    async refreshLogs() {
        try {
            const response = await fetch('/api/logs');
            const data = await response.json();
            
            const logsContainer = document.getElementById('logs-container');
            
            if (data.logs && data.logs.length > 0) {
                logsContainer.innerHTML = data.logs.map(log => 
                    this.formatLogEntry(log)
                ).join('');
            } else {
                logsContainer.innerHTML = `
                    <div class="text-center text-muted p-3">
                        <i class="fas fa-file-alt fa-2x mb-2"></i>
                        <p>No logs available</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to refresh logs:', error);
            document.getElementById('logs-container').innerHTML = `
                <div class="text-center text-danger p-3">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                    <p>Failed to load logs</p>
                </div>
            `;
        }
    }

    formatLogEntry(log) {
        const levelClass = {
            'ERROR': 'text-danger',
            'WARN': 'text-warning',
            'INFO': 'text-info',
            'DEBUG': 'text-muted'
        };

        const levelIcon = {
            'ERROR': 'fas fa-exclamation-circle',
            'WARN': 'fas fa-exclamation-triangle',
            'INFO': 'fas fa-info-circle',
            'DEBUG': 'fas fa-bug'
        };

        return `
            <div class="log-entry p-2 border-bottom">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <small class="text-muted">${new Date(log.timestamp).toLocaleString()}</small>
                        <span class="badge badge-sm ${levelClass[log.level] || 'bg-secondary'} ms-2">
                            <i class="${levelIcon[log.level] || 'fas fa-circle'} me-1"></i>${log.level}
                        </span>
                        <div class="mt-1">${this.escapeHtml(log.message)}</div>
                        ${log.data ? `<pre class="mt-1 mb-0 text-muted small">${this.escapeHtml(JSON.stringify(log.data, null, 2))}</pre>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatUptime(uptime) {
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    formatRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.refreshStats();
        }, 5000); // Refresh every 5 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Global functions for button handlers
async function restartBot() {
    if (!confirm('Are you sure you want to restart the bot?')) return;
    
    try {
        const response = await fetch('/api/restart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Bot restarted successfully', 'success');
            dashboard.refreshStats();
        } else {
            showNotification('Failed to restart bot: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification('Error restarting bot: ' + error.message, 'error');
    }
}

function refreshStats() {
    dashboard.refreshStats();
    showNotification('Stats refreshed', 'info');
}

function refreshLogs() {
    dashboard.refreshLogs();
    showNotification('Logs refreshed', 'info');
}

function clearLogs() {
    if (!confirm('Are you sure you want to clear all logs?')) return;
    
    document.getElementById('logs-container').innerHTML = `
        <div class="text-center text-muted p-3">
            <i class="fas fa-file-alt fa-2x mb-2"></i>
            <p>No logs available</p>
        </div>
    `;
    showNotification('Logs cleared', 'info');
}

function saveSettings() {
    const settings = {
        enableNLP: document.getElementById('enableNLP').checked,
        respondToGroups: document.getElementById('respondToGroups').checked,
        enableTyping: document.getElementById('enableTyping').checked
    };
    
    // In a real implementation, you'd send these to the backend
    console.log('Saving settings:', settings);
    showNotification('Settings saved successfully', 'success');
}

function showNotification(message, type = 'info') {
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    };

    const notification = document.createElement('div');
    notification.className = `alert ${alertClass[type]} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (dashboard) {
        dashboard.stopAutoRefresh();
    }
});
