/**
 * Achievement and Badge System
 * Gamifies the FIFA Tracker experience with achievements and badges
 */

class AchievementSystem {
    constructor() {
        this.achievements = new Map();
        this.playerBadges = new Map();
        this.teamBadges = new Map();
        this.initialized = false;
        this.initializeAchievements();
    }

    /**
     * Initialize all available achievements
     */
    initializeAchievements() {
        // Player achievements
        this.registerAchievement('first_goal', {
            name: 'Erstes Tor',
            description: 'Erzielen Sie Ihr erstes Tor',
            icon: 'fas fa-futbol',
            color: 'text-green-400',
            category: 'goals',
            condition: (stats) => stats.goals >= 1,
            points: 10
        });

        this.registerAchievement('hat_trick_hero', {
            name: 'Hat-Trick Held',
            description: 'Erzielen Sie einen Hat-Trick in einem Spiel',
            icon: 'fas fa-crown',
            color: 'text-yellow-400',
            category: 'goals',
            condition: (stats) => stats.maxGoalsInGame >= 3,
            points: 50
        });

        this.registerAchievement('goal_machine', {
            name: 'Tormaschine',
            description: 'Erzielen Sie 10 Tore',
            icon: 'fas fa-fire',
            color: 'text-red-400',
            category: 'goals',
            condition: (stats) => stats.goals >= 10,
            points: 30
        });

        this.registerAchievement('sharpshooter', {
            name: 'Scharfschütze',
            description: 'Erzielen Sie 25 Tore',
            icon: 'fas fa-crosshairs',
            color: 'text-purple-400',
            category: 'goals',
            condition: (stats) => stats.goals >= 25,
            points: 75
        });

        this.registerAchievement('legend', {
            name: 'Legende',
            description: 'Erzielen Sie 50 Tore',
            icon: 'fas fa-trophy',
            color: 'text-yellow-400',
            category: 'goals',
            condition: (stats) => stats.goals >= 50,
            points: 150
        });

        // Man of the Match achievements
        this.registerAchievement('first_motm', {
            name: 'Erster Star',
            description: 'Werden Sie zum ersten Mal Spieler des Spiels',
            icon: 'fas fa-star',
            color: 'text-yellow-400',
            category: 'motm',
            condition: (stats) => stats.motmCount >= 1,
            points: 20
        });

        this.registerAchievement('consistent_performer', {
            name: 'Konstanter Leistungsträger',
            description: 'Werden Sie 5x Spieler des Spiels',
            icon: 'fas fa-medal',
            color: 'text-blue-400',
            category: 'motm',
            condition: (stats) => stats.motmCount >= 5,
            points: 40
        });

        this.registerAchievement('superstar', {
            name: 'Superstar',
            description: 'Werden Sie 10x Spieler des Spiels',
            icon: 'fas fa-gem',
            color: 'text-purple-400',
            category: 'motm',
            condition: (stats) => stats.motmCount >= 10,
            points: 80
        });

        // Win streak achievements
        this.registerAchievement('winning_start', {
            name: 'Siegreicher Start',
            description: 'Gewinnen Sie 3 Spiele in Folge',
            icon: 'fas fa-chart-line',
            color: 'text-green-400',
            category: 'streaks',
            condition: (stats) => stats.streaks && stats.streaks.current >= 3 && stats.streaks.type === 'wins',
            points: 25
        });

        this.registerAchievement('unstoppable', {
            name: 'Unaufhaltsam',
            description: 'Gewinnen Sie 5 Spiele in Folge',
            icon: 'fas fa-rocket',
            color: 'text-orange-400',
            category: 'streaks',
            condition: (stats) => stats.streaks && stats.streaks.current >= 5 && stats.streaks.type === 'wins',
            points: 50
        });

        this.registerAchievement('perfect_form', {
            name: 'Perfekte Form',
            description: 'Gewinnen Sie 10 Spiele in Folge',
            icon: 'fas fa-infinity',
            color: 'text-purple-400',
            category: 'streaks',
            condition: (stats) => stats.streaks && stats.streaks.current >= 10 && stats.streaks.type === 'wins',
            points: 100
        });

        // Win rate achievements
        this.registerAchievement('reliable', {
            name: 'Zuverlässig',
            description: 'Erreichen Sie eine Siegesrate von 60%',
            icon: 'fas fa-check-circle',
            color: 'text-green-400',
            category: 'winrate',
            condition: (stats) => stats.totalMatches >= 10 && parseFloat(stats.winRate) >= 60,
            points: 35
        });

        this.registerAchievement('dominant', {
            name: 'Dominant',
            description: 'Erreichen Sie eine Siegesrate von 75%',
            icon: 'fas fa-crown',
            color: 'text-yellow-400',
            category: 'winrate',
            condition: (stats) => stats.totalMatches >= 15 && parseFloat(stats.winRate) >= 75,
            points: 60
        });

        this.registerAchievement('invincible', {
            name: 'Unbesiegbar',
            description: 'Erreichen Sie eine Siegesrate von 90%',
            icon: 'fas fa-shield-alt',
            color: 'text-purple-400',
            category: 'winrate',
            condition: (stats) => stats.totalMatches >= 20 && parseFloat(stats.winRate) >= 90,
            points: 120
        });

        // Performance achievements
        this.registerAchievement('rising_star', {
            name: 'Aufgehender Stern',
            description: 'Erreichen Sie ein Performance-Rating von 70',
            icon: 'fas fa-star-half-alt',
            color: 'text-yellow-400',
            category: 'performance',
            condition: (stats) => stats.performance >= 70,
            points: 30
        });

        this.registerAchievement('elite_player', {
            name: 'Elite-Spieler',
            description: 'Erreichen Sie ein Performance-Rating von 85',
            icon: 'fas fa-chess-king',
            color: 'text-purple-400',
            category: 'performance',
            condition: (stats) => stats.performance >= 85,
            points: 60
        });

        this.registerAchievement('world_class', {
            name: 'Weltklasse',
            description: 'Erreichen Sie ein Performance-Rating von 95',
            icon: 'fas fa-globe',
            color: 'text-gold-400',
            category: 'performance',
            condition: (stats) => stats.performance >= 95,
            points: 100
        });

        // Experience achievements
        this.registerAchievement('veteran', {
            name: 'Veteran',
            description: 'Spielen Sie 25 Spiele',
            icon: 'fas fa-user-graduate',
            color: 'text-blue-400',
            category: 'experience',
            condition: (stats) => stats.totalMatches >= 25,
            points: 25
        });

        this.registerAchievement('club_legend', {
            name: 'Vereinslegende',
            description: 'Spielen Sie 50 Spiele',
            icon: 'fas fa-heart',
            color: 'text-red-400',
            category: 'experience',
            condition: (stats) => stats.totalMatches >= 50,
            points: 50
        });

        this.registerAchievement('eternal_player', {
            name: 'Ewiger Spieler',
            description: 'Spielen Sie 100 Spiele',
            icon: 'fas fa-infinity',
            color: 'text-purple-400',
            category: 'experience',
            condition: (stats) => stats.totalMatches >= 100,
            points: 100
        });

        // Special achievements
        this.registerAchievement('comeback_king', {
            name: 'Comeback-König',
            description: 'Gewinnen Sie nach einer 5-Spiele Niederlagenserie',
            icon: 'fas fa-phoenix-alt',
            color: 'text-orange-400',
            category: 'special',
            condition: (stats) => this.checkComebackCondition(stats),
            points: 75
        });

        this.registerAchievement('jack_of_all_trades', {
            name: 'Allrounder',
            description: 'Spielen Sie auf 3 verschiedenen Positionen',
            icon: 'fas fa-shapes',
            color: 'text-green-400',
            category: 'special',
            condition: (stats) => stats.positionsPlayed >= 3,
            points: 40
        });

        // Team achievements
        this.registerTeamAchievement('perfect_season', {
            name: 'Perfekte Saison',
            description: 'Gewinnen Sie 10 Spiele in Folge als Team',
            icon: 'fas fa-trophy',
            color: 'text-gold-400',
            condition: (teamStats) => teamStats.streak && teamStats.streak.count >= 10 && teamStats.streak.type === 'wins',
            points: 200
        });

        this.registerTeamAchievement('goal_fest', {
            name: 'Torfestival',
            description: 'Erzielen Sie 100 Tore als Team',
            icon: 'fas fa-fire',
            color: 'text-red-400',
            condition: (teamStats) => teamStats.goalsFor >= 100,
            points: 100
        });

        this.registerTeamAchievement('fortress', {
            name: 'Festung',
            description: 'Lassen Sie in 10 aufeinanderfolgenden Spielen weniger als 1 Tor pro Spiel zu',
            icon: 'fas fa-shield-alt',
            color: 'text-blue-400',
            condition: (teamStats) => this.checkFortressCondition(teamStats),
            points: 150
        });

        this.initialized = true;
    }

    /**
     * Register a player achievement
     */
    registerAchievement(id, achievement) {
        this.achievements.set(id, achievement);
    }

    /**
     * Register a team achievement
     */
    registerTeamAchievement(id, achievement) {
        this.achievements.set(id, { ...achievement, isTeamAchievement: true });
    }

    /**
     * Check and award achievements for a player
     */
    async checkPlayerAchievements(playerId, playerStats) {
        if (!this.initialized || !playerStats) return [];

        const newAchievements = [];
        const currentBadges = this.playerBadges.get(playerId) || [];
        const currentBadgeIds = new Set(currentBadges.map(b => b.id));

        for (const [id, achievement] of this.achievements.entries()) {
            if (achievement.isTeamAchievement || currentBadgeIds.has(id)) continue;

            try {
                if (achievement.condition(playerStats)) {
                    const badge = {
                        id,
                        ...achievement,
                        earnedAt: new Date().toISOString(),
                        playerId
                    };
                    
                    currentBadges.push(badge);
                    newAchievements.push(badge);
                }
            } catch (error) {
                console.warn(`Error checking achievement ${id}:`, error);
            }
        }

        if (newAchievements.length > 0) {
            this.playerBadges.set(playerId, currentBadges);
            await this.saveBadges();
            this.showAchievementNotifications(newAchievements);
        }

        return newAchievements;
    }

    /**
     * Check and award team achievements
     */
    async checkTeamAchievements(team, teamStats) {
        if (!this.initialized || !teamStats) return [];

        const newAchievements = [];
        const currentBadges = this.teamBadges.get(team) || [];
        const currentBadgeIds = new Set(currentBadges.map(b => b.id));

        for (const [id, achievement] of this.achievements.entries()) {
            if (!achievement.isTeamAchievement || currentBadgeIds.has(id)) continue;

            try {
                if (achievement.condition(teamStats)) {
                    const badge = {
                        id,
                        ...achievement,
                        earnedAt: new Date().toISOString(),
                        team
                    };
                    
                    currentBadges.push(badge);
                    newAchievements.push(badge);
                }
            } catch (error) {
                console.warn(`Error checking team achievement ${id}:`, error);
            }
        }

        if (newAchievements.length > 0) {
            this.teamBadges.set(team, currentBadges);
            await this.saveBadges();
            this.showAchievementNotifications(newAchievements);
        }

        return newAchievements;
    }

    /**
     * Show achievement notifications
     */
    showAchievementNotifications(achievements) {
        achievements.forEach((achievement, index) => {
            setTimeout(() => {
                this.showAchievementPopup(achievement);
            }, index * 1500); // Stagger notifications
        });
    }

    /**
     * Show individual achievement popup
     */
    showAchievementPopup(achievement) {
        const popup = document.createElement('div');
        popup.className = 'fixed top-4 right-4 z-50 achievement-popup';
        popup.innerHTML = `
            <div class="bg-gradient-to-r from-yellow-400 to-orange-500 text-black p-4 rounded-lg shadow-xl border-2 border-yellow-300 max-w-sm animate-slide-in">
                <div class="flex items-center space-x-3">
                    <div class="text-2xl">
                        <i class="${achievement.icon}"></i>
                    </div>
                    <div class="flex-1">
                        <div class="font-bold text-lg">🏆 Achievement freigeschaltet!</div>
                        <div class="font-semibold">${achievement.name}</div>
                        <div class="text-sm opacity-90">${achievement.description}</div>
                        <div class="text-xs mt-1 opacity-75">+${achievement.points} Punkte</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Add confetti effect
        this.triggerConfetti();

        // Remove after 5 seconds
        setTimeout(() => {
            popup.classList.add('animate-slide-out');
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
            }, 300);
        }, 5000);
    }

    /**
     * Trigger confetti animation
     */
    triggerConfetti() {
        // Simple confetti effect using emoji
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'fixed pointer-events-none z-40 text-2xl animate-bounce';
                confetti.style.left = Math.random() * window.innerWidth + 'px';
                confetti.style.top = '-50px';
                confetti.textContent = ['🎉', '🎊', '⭐', '🏆', '🥇'][Math.floor(Math.random() * 5)];
                
                document.body.appendChild(confetti);
                
                // Animate falling
                let pos = -50;
                const fall = setInterval(() => {
                    pos += 5;
                    confetti.style.top = pos + 'px';
                    if (pos > window.innerHeight + 50) {
                        clearInterval(fall);
                        if (confetti.parentNode) {
                            confetti.parentNode.removeChild(confetti);
                        }
                    }
                }, 50);
            }, i * 100);
        }
    }

    /**
     * Get player achievements
     */
    getPlayerAchievements(playerId) {
        return this.playerBadges.get(playerId) || [];
    }

    /**
     * Get team achievements
     */
    getTeamAchievements(team) {
        return this.teamBadges.get(team) || [];
    }

    /**
     * Get player achievement points
     */
    getPlayerPoints(playerId) {
        const badges = this.getPlayerAchievements(playerId);
        return badges.reduce((total, badge) => total + badge.points, 0);
    }

    /**
     * Get team achievement points
     */
    getTeamPoints(team) {
        const badges = this.getTeamAchievements(team);
        return badges.reduce((total, badge) => total + badge.points, 0);
    }

    /**
     * Get achievement progress for a player
     */
    getAchievementProgress(playerId, playerStats) {
        const progress = [];
        const earnedBadgeIds = new Set(this.getPlayerAchievements(playerId).map(b => b.id));

        for (const [id, achievement] of this.achievements.entries()) {
            if (achievement.isTeamAchievement) continue;

            const isEarned = earnedBadgeIds.has(id);
            let progressPercent = 0;

            if (!isEarned) {
                progressPercent = this.calculateAchievementProgress(achievement, playerStats);
            }

            progress.push({
                id,
                ...achievement,
                isEarned,
                progressPercent: isEarned ? 100 : progressPercent
            });
        }

        return progress.sort((a, b) => {
            if (a.isEarned !== b.isEarned) {
                return a.isEarned ? 1 : -1; // Earned achievements last
            }
            return b.progressPercent - a.progressPercent; // Sort by progress
        });
    }

    /**
     * Calculate achievement progress percentage
     */
    calculateAchievementProgress(achievement, stats) {
        if (!stats) return 0;

        try {
            // This is a simplified progress calculation
            // In a real implementation, you'd want more specific progress tracking
            
            switch (achievement.category) {
                case 'goals':
                    if (achievement.id === 'first_goal') return Math.min(stats.goals * 100, 100);
                    if (achievement.id === 'goal_machine') return Math.min((stats.goals / 10) * 100, 100);
                    if (achievement.id === 'sharpshooter') return Math.min((stats.goals / 25) * 100, 100);
                    if (achievement.id === 'legend') return Math.min((stats.goals / 50) * 100, 100);
                    break;
                    
                case 'motm':
                    if (achievement.id === 'first_motm') return Math.min(stats.motmCount * 100, 100);
                    if (achievement.id === 'consistent_performer') return Math.min((stats.motmCount / 5) * 100, 100);
                    if (achievement.id === 'superstar') return Math.min((stats.motmCount / 10) * 100, 100);
                    break;
                    
                case 'winrate':
                    const winRate = parseFloat(stats.winRate);
                    if (achievement.id === 'reliable') return Math.min((winRate / 60) * 100, 100);
                    if (achievement.id === 'dominant') return Math.min((winRate / 75) * 100, 100);
                    if (achievement.id === 'invincible') return Math.min((winRate / 90) * 100, 100);
                    break;
                    
                case 'experience':
                    if (achievement.id === 'veteran') return Math.min((stats.totalMatches / 25) * 100, 100);
                    if (achievement.id === 'club_legend') return Math.min((stats.totalMatches / 50) * 100, 100);
                    if (achievement.id === 'eternal_player') return Math.min((stats.totalMatches / 100) * 100, 100);
                    break;
                    
                case 'performance':
                    if (achievement.id === 'rising_star') return Math.min((stats.performance / 70) * 100, 100);
                    if (achievement.id === 'elite_player') return Math.min((stats.performance / 85) * 100, 100);
                    if (achievement.id === 'world_class') return Math.min((stats.performance / 95) * 100, 100);
                    break;
            }
        } catch (error) {
            console.warn('Error calculating progress:', error);
        }

        return 0;
    }

    /**
     * Special condition checkers
     */
    checkComebackCondition(stats) {
        // This would need to track recent match history to detect comebacks
        // Simplified implementation
        return stats.streaks && stats.streaks.current >= 3 && stats.streaks.type === 'wins';
    }

    checkFortressCondition(teamStats) {
        // This would need to track recent defensive performance
        // Simplified implementation
        return teamStats.averageGoalsAgainst && parseFloat(teamStats.averageGoalsAgainst) < 1.0;
    }

    /**
     * Render achievements panel
     */
    renderAchievementsPanel(playerId, playerStats) {
        const achievements = this.getAchievementProgress(playerId, playerStats);
        const totalPoints = this.getPlayerPoints(playerId);
        const earnedCount = achievements.filter(a => a.isEarned).length;

        return `
        <div class="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-100 flex items-center">
                    <i class="fas fa-trophy mr-3 text-yellow-400"></i>
                    Achievements
                </h3>
                <div class="text-right">
                    <div class="text-lg font-bold text-yellow-400">${totalPoints} Punkte</div>
                    <div class="text-sm text-gray-400">${earnedCount}/${achievements.length} freigeschaltet</div>
                </div>
            </div>

            <!-- Achievement Categories -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${achievements.map(achievement => `
                    <div class="p-4 rounded-lg border ${achievement.isEarned ? 'bg-slate-700 border-yellow-400' : 'bg-slate-900 border-slate-600'} 
                         ${achievement.isEarned ? 'shadow-lg shadow-yellow-400/20' : ''}">
                        <div class="flex items-start space-x-3">
                            <div class="text-2xl ${achievement.color} ${achievement.isEarned ? '' : 'opacity-50'}">
                                <i class="${achievement.icon}"></i>
                            </div>
                            <div class="flex-1">
                                <h4 class="font-semibold ${achievement.isEarned ? 'text-white' : 'text-gray-400'}">
                                    ${achievement.name}
                                </h4>
                                <p class="text-sm ${achievement.isEarned ? 'text-gray-300' : 'text-gray-500'} mb-2">
                                    ${achievement.description}
                                </p>
                                <div class="flex justify-between items-center">
                                    <span class="text-xs ${achievement.isEarned ? 'text-yellow-400' : 'text-gray-500'}">
                                        ${achievement.points} Punkte
                                    </span>
                                    ${achievement.isEarned ? 
                                        '<span class="text-xs text-green-400">✓ Freigeschaltet</span>' :
                                        `<span class="text-xs text-gray-400">${Math.round(achievement.progressPercent)}%</span>`
                                    }
                                </div>
                                ${!achievement.isEarned ? `
                                    <div class="mt-2">
                                        <div class="w-full bg-slate-600 rounded-full h-2">
                                            <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                                                 style="width: ${achievement.progressPercent}%"></div>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        `;
    }

    /**
     * Save badges to localStorage
     */
    async saveBadges() {
        try {
            const data = {
                playerBadges: Object.fromEntries(this.playerBadges),
                teamBadges: Object.fromEntries(this.teamBadges),
                lastSaved: new Date().toISOString()
            };
            localStorage.setItem('fifa-tracker-achievements', JSON.stringify(data));
        } catch (error) {
            console.warn('Could not save achievements:', error);
        }
    }

    /**
     * Load badges from localStorage
     */
    async loadBadges() {
        try {
            const saved = localStorage.getItem('fifa-tracker-achievements');
            if (saved) {
                const data = JSON.parse(saved);
                this.playerBadges = new Map(Object.entries(data.playerBadges || {}));
                this.teamBadges = new Map(Object.entries(data.teamBadges || {}));
            }
        } catch (error) {
            console.warn('Could not load achievements:', error);
        }
    }

    /**
     * Reset all achievements
     */
    async resetAchievements() {
        this.playerBadges.clear();
        this.teamBadges.clear();
        await this.saveBadges();
    }
}

// CSS for achievement animations
const achievementCSS = `
.achievement-popup {
    animation: slideInRight 0.3s ease-out;
}

.animate-slide-in {
    animation: slideInRight 0.3s ease-out;
}

.animate-slide-out {
    animation: slideOutRight 0.3s ease-in;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOutRight {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}
`;

// Inject CSS
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = achievementCSS;
    document.head.appendChild(style);
}

// Export the achievement system
export const achievementSystem = new AchievementSystem();