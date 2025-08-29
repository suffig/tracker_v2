/**
 * Enhanced Chart and Data Visualization Module
 * Provides interactive charts and visualizations for the FIFA Tracker
 */

// Chart.js alternative - lightweight canvas-based charts
class ChartRenderer {
    constructor() {
        this.colors = {
            primary: '#10B981',
            secondary: '#3B82F6', 
            accent: '#F59E0B',
            danger: '#EF4444',
            success: '#22C55E',
            warning: '#F59E0B',
            AEK: '#3B82F6',
            Real: '#EF4444',
            background: '#1E293B',
            text: '#F1F5F9'
        };
    }

    /**
     * Create a performance radar chart for a player
     */
    createPlayerRadarChart(container, playerData) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        canvas.className = 'w-full h-auto max-w-sm mx-auto';
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 120;
        
        // Clear canvas with dark background
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const stats = [
            { label: 'Tore', value: playerData.goals || 0, max: 50 },
            { label: 'SdS', value: playerData.motm || 0, max: 20 },
            { label: 'Spiele', value: playerData.matches || 0, max: 100 },
            { label: 'Erfolgsrate', value: playerData.winRate || 0, max: 100 },
            { label: 'Marktwert', value: (playerData.value || 0) / 10, max: 20 },
            { label: 'Form', value: playerData.form || 50, max: 100 }
        ];
        
        const angleStep = (2 * Math.PI) / stats.length;
        
        // Draw background grid
        ctx.strokeStyle = this.colors.text + '20';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radius * i) / 5, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        // Draw axis lines
        stats.forEach((_, index) => {
            const angle = angleStep * index - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
        });
        
        // Draw data area
        ctx.beginPath();
        ctx.fillStyle = this.colors.primary + '40';
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 2;
        
        stats.forEach((stat, index) => {
            const angle = angleStep * index - Math.PI / 2;
            const value = Math.min(stat.value / stat.max, 1);
            const x = centerX + Math.cos(angle) * radius * value;
            const y = centerY + Math.sin(angle) * radius * value;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw labels
        ctx.fillStyle = this.colors.text;
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        
        stats.forEach((stat, index) => {
            const angle = angleStep * index - Math.PI / 2;
            const labelRadius = radius + 20;
            const x = centerX + Math.cos(angle) * labelRadius;
            const y = centerY + Math.sin(angle) * labelRadius;
            
            ctx.fillText(stat.label, x, y + 4);
            ctx.fillText(stat.value.toString(), x, y + 18);
        });
        
        container.innerHTML = '';
        container.appendChild(canvas);
    }

    /**
     * Create a team comparison bar chart
     */
    createTeamComparisonChart(container, aekData, realData) {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        canvas.className = 'w-full h-auto';
        
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const metrics = [
            { label: 'Siege', aek: aekData.wins || 0, real: realData.wins || 0 },
            { label: 'Tore', aek: aekData.goals || 0, real: realData.goals || 0 },
            { label: 'SdS', aek: aekData.motm || 0, real: realData.motm || 0 },
            { label: 'Budget', aek: (aekData.balance || 0) / 1000000, real: (realData.balance || 0) / 1000000 }
        ];
        
        const barWidth = 30;
        const spacing = 80;
        const startX = 60;
        const maxHeight = 200;
        
        // Find max value for scaling
        const maxValue = Math.max(...metrics.flatMap(m => [m.aek, m.real]));
        
        metrics.forEach((metric, index) => {
            const x = startX + index * spacing;
            const baseY = 250;
            
            // AEK bar
            const aekHeight = (metric.aek / maxValue) * maxHeight;
            ctx.fillStyle = this.colors.AEK;
            ctx.fillRect(x, baseY - aekHeight, barWidth, aekHeight);
            
            // Real bar
            const realHeight = (metric.real / maxValue) * maxHeight;
            ctx.fillStyle = this.colors.Real;
            ctx.fillRect(x + barWidth + 5, baseY - realHeight, barWidth, realHeight);
            
            // Labels
            ctx.fillStyle = this.colors.text;
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(metric.label, x + barWidth, baseY + 20);
            
            // Values
            ctx.font = '10px Inter, sans-serif';
            ctx.fillStyle = this.colors.AEK;
            ctx.fillText(metric.aek.toString(), x + barWidth/2, baseY - aekHeight - 5);
            ctx.fillStyle = this.colors.Real;
            ctx.fillText(metric.real.toString(), x + barWidth + 5 + barWidth/2, baseY - realHeight - 5);
        });
        
        // Legend
        ctx.fillStyle = this.colors.AEK;
        ctx.fillRect(20, 20, 15, 15);
        ctx.fillStyle = this.colors.text;
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('AEK', 40, 32);
        
        ctx.fillStyle = this.colors.Real;
        ctx.fillRect(80, 20, 15, 15);
        ctx.fillStyle = this.colors.text;
        ctx.fillText('Real', 100, 32);
        
        container.innerHTML = '';
        container.appendChild(canvas);
    }

    /**
     * Create a performance trend line chart
     */
    createTrendChart(container, data, title = 'Performance Trend') {
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 250;
        canvas.className = 'w-full h-auto';
        
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!data || data.length === 0) {
            ctx.fillStyle = this.colors.text;
            ctx.font = '16px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Keine Daten verfügbar', canvas.width / 2, canvas.height / 2);
            container.innerHTML = '';
            container.appendChild(canvas);
            return;
        }
        
        const padding = 50;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        
        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        const valueRange = maxValue - minValue || 1;
        
        // Draw grid
        ctx.strokeStyle = this.colors.text + '20';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight * i) / 5;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
        }
        
        // Draw line
        ctx.strokeStyle = this.colors.primary;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = padding + (chartWidth * index) / (data.length - 1);
            const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = this.colors.primary;
        data.forEach((point, index) => {
            const x = padding + (chartWidth * index) / (data.length - 1);
            const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // Title
        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, canvas.width / 2, 25);
        
        container.innerHTML = '';
        container.appendChild(canvas);
    }

    /**
     * Create a donut chart for team statistics
     */
    createDonutChart(container, data, title = 'Statistics') {
        const canvas = document.createElement('canvas');
        canvas.width = 250;
        canvas.height = 250;
        canvas.className = 'w-full h-auto max-w-xs mx-auto';
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 80;
        const innerRadius = 50;
        
        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!data || data.length === 0) {
            ctx.fillStyle = this.colors.text;
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Keine Daten', centerX, centerY);
            container.innerHTML = '';
            container.appendChild(canvas);
            return;
        }
        
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = -Math.PI / 2;
        
        const colors = [this.colors.primary, this.colors.secondary, this.colors.accent, this.colors.danger, this.colors.success];
        
        data.forEach((item, index) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            
            // Draw slice
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
            ctx.closePath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            
            currentAngle += sliceAngle;
        });
        
        // Title in center
        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, centerX, centerY - 5);
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`Total: ${total}`, centerX, centerY + 10);
        
        container.innerHTML = '';
        container.appendChild(canvas);
        
        // Add legend
        const legend = document.createElement('div');
        legend.className = 'mt-4 space-y-2';
        data.forEach((item, index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'flex items-center space-x-2 text-sm';
            legendItem.innerHTML = `
                <div class="w-3 h-3 rounded-full" style="background-color: ${colors[index % colors.length]}"></div>
                <span class="text-gray-300">${item.label}: ${item.value}</span>
            `;
            legend.appendChild(legendItem);
        });
        container.appendChild(legend);
    }
}

// Export for use in other modules
export const chartRenderer = new ChartRenderer();