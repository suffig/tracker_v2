/**
 * Advanced Analytics Module
 * Provides comprehensive statistics and insights for the FIFA Tracker
 */

import { chartRenderer } from './charts.js';

class AnalyticsEngine {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Calculate comprehensive player statistics
     */
    calculatePlayerStats(playerId, matches, players, sdsData = []) {
        const cacheKey = `player-stats-${playerId}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        const player = players.find(p => p.id === playerId || p.name === playerId);
        if (!player) return null;

        const playerMatches = matches.filter(m => 
            m.aek_players?.includes(player.name) || 
            m.real_players?.includes(player.name)
        );

        const playerSds = sdsData.filter(s => s.player_name === player.name);
        
        const goals = matches.reduce((total, match) => {
            const teamGoals = player.team === 'AEK' ? match.aek_goals : match.real_goals;
            const playerGoalsInMatch = this.calculatePlayerGoalsInMatch(match, player.name);
            return total + playerGoalsInMatch;
        }, 0);

        const wins = playerMatches.filter(m => {
            if (player.team === 'AEK') {
                return m.aek_goals > m.real_goals;
            } else {
                return m.real_goals > m.aek_goals;
            }
        }).length;

        const draws = playerMatches.filter(m => m.aek_goals === m.real_goals).length;
        const losses = playerMatches.length - wins - draws;

        const stats = {
            player,
            totalMatches: playerMatches.length,
            goals,
            assists: this.calculateAssists(playerMatches, player.name),
            motmCount: playerSds.length,
            wins,
            draws,
            losses,
            winRate: playerMatches.length > 0 ? (wins / playerMatches.length * 100).toFixed(1) : 0,
            goalsPerMatch: playerMatches.length > 0 ? (goals / playerMatches.length).toFixed(2) : 0,
            form: this.calculatePlayerForm(playerMatches.slice(-5), player),
            performance: this.calculatePerformanceRating(player, goals, playerSds.length, wins, playerMatches.length),
            streaks: this.calculateStreaks(playerMatches, player),
            recentMatches: playerMatches.slice(-10).reverse()
        };

        this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
        return stats;
    }

    /**
     * Calculate team statistics and comparisons
     */
    calculateTeamStats(matches, players, finances) {
        const aekPlayers = players.filter(p => p.team === 'AEK');
        const realPlayers = players.filter(p => p.team === 'Real');

        const aekStats = this.calculateTeamStatistics(matches, 'AEK', aekPlayers);
        const realStats = this.calculateTeamStatistics(matches, 'Real', realPlayers);

        const aekFinances = finances.find(f => f.team === 'AEK') || { balance: 0, debt: 0 };
        const realFinances = finances.find(f => f.team === 'Real') || { balance: 0, debt: 0 };

        return {
            AEK: { ...aekStats, finances: aekFinances, players: aekPlayers },
            Real: { ...realStats, finances: realFinances, players: realPlayers },
            comparison: this.createTeamComparison(aekStats, realStats),
            trends: this.calculateTeamTrends(matches)
        };
    }

    /**
     * Calculate individual team statistics
     */
    calculateTeamStatistics(matches, team, players) {
        const teamMatches = matches.filter(m => 
            (team === 'AEK' && (m.aek_players || []).length > 0) ||
            (team === 'Real' && (m.real_players || []).length > 0)
        );

        const wins = teamMatches.filter(m => {
            return team === 'AEK' ? 
                m.aek_goals > m.real_goals : 
                m.real_goals > m.aek_goals;
        }).length;

        const draws = teamMatches.filter(m => m.aek_goals === m.real_goals).length;
        const losses = teamMatches.length - wins - draws;

        const totalGoalsFor = teamMatches.reduce((total, m) => 
            total + (team === 'AEK' ? m.aek_goals : m.real_goals), 0);
        
        const totalGoalsAgainst = teamMatches.reduce((total, m) => 
            total + (team === 'AEK' ? m.real_goals : m.aek_goals), 0);

        const averageValue = players.reduce((sum, p) => sum + (p.value || 0), 0) / players.length;

        return {
            totalMatches: teamMatches.length,
            wins,
            draws,
            losses,
            goalsFor: totalGoalsFor,
            goalsAgainst: totalGoalsAgainst,
            goalDifference: totalGoalsFor - totalGoalsAgainst,
            winRate: teamMatches.length > 0 ? (wins / teamMatches.length * 100).toFixed(1) : 0,
            averageGoalsFor: teamMatches.length > 0 ? (totalGoalsFor / teamMatches.length).toFixed(2) : 0,
            averageGoalsAgainst: teamMatches.length > 0 ? (totalGoalsAgainst / teamMatches.length).toFixed(2) : 0,
            form: this.calculateTeamForm(teamMatches.slice(-5), team),
            players: players,
            squadValue: players.reduce((sum, p) => sum + (p.value || 0), 0),
            averagePlayerValue: averageValue,
            streak: this.calculateCurrentStreak(teamMatches, team)
        };
    }

    /**
     * Calculate player performance rating
     */
    calculatePerformanceRating(player, goals, motm, wins, totalMatches) {
        if (totalMatches === 0) return 50;

        let rating = 50; // Base rating
        
        // Goals contribution (max 20 points)
        const goalsPerMatch = goals / Math.max(totalMatches, 1);
        rating += Math.min(goalsPerMatch * 10, 20);
        
        // Man of the match contribution (max 15 points)
        const motmPerMatch = motm / Math.max(totalMatches, 1);
        rating += Math.min(motmPerMatch * 30, 15);
        
        // Win contribution (max 15 points)
        const winRate = wins / Math.max(totalMatches, 1);
        rating += winRate * 15;
        
        return Math.min(Math.round(rating), 100);
    }

    /**
     * Calculate player form based on recent matches
     */
    calculatePlayerForm(recentMatches, player) {
        if (recentMatches.length === 0) return 50;

        let formPoints = 0;
        const maxPoints = recentMatches.length * 3; // 3 points for win, 1 for draw

        recentMatches.forEach(match => {
            if (player.team === 'AEK') {
                if (match.aek_goals > match.real_goals) formPoints += 3;
                else if (match.aek_goals === match.real_goals) formPoints += 1;
            } else {
                if (match.real_goals > match.aek_goals) formPoints += 3;
                else if (match.real_goals === match.aek_goals) formPoints += 1;
            }
        });

        return Math.round((formPoints / maxPoints) * 100);
    }

    /**
     * Calculate team form
     */
    calculateTeamForm(recentMatches, team) {
        if (recentMatches.length === 0) return 50;

        let formPoints = 0;
        const maxPoints = recentMatches.length * 3;

        recentMatches.forEach(match => {
            if (team === 'AEK') {
                if (match.aek_goals > match.real_goals) formPoints += 3;
                else if (match.aek_goals === match.real_goals) formPoints += 1;
            } else {
                if (match.real_goals > match.aek_goals) formPoints += 3;
                else if (match.real_goals === match.aek_goals) formPoints += 1;
            }
        });

        return Math.round((formPoints / maxPoints) * 100);
    }

    /**
     * Calculate win/loss streaks
     */
    calculateStreaks(matches, player) {
        if (matches.length === 0) return { current: 0, longest: 0, type: 'none' };

        const results = matches.map(match => {
            if (player.team === 'AEK') {
                if (match.aek_goals > match.real_goals) return 'W';
                if (match.aek_goals === match.real_goals) return 'D';
                return 'L';
            } else {
                if (match.real_goals > match.aek_goals) return 'W';
                if (match.real_goals === match.aek_goals) return 'D';
                return 'L';
            }
        });

        let currentStreak = 0;
        let longestStreak = 0;
        let currentType = results[results.length - 1];
        
        // Count current streak
        for (let i = results.length - 1; i >= 0; i--) {
            if (results[i] === currentType) {
                currentStreak++;
            } else {
                break;
            }
        }

        // Find longest streak of any type
        let tempStreak = 1;
        let tempType = results[0];
        
        for (let i = 1; i < results.length; i++) {
            if (results[i] === tempType) {
                tempStreak++;
            } else {
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                }
                tempStreak = 1;
                tempType = results[i];
            }
        }
        
        if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
        }

        return {
            current: currentStreak,
            longest: longestStreak,
            type: currentType === 'W' ? 'wins' : currentType === 'L' ? 'losses' : 'draws'
        };
    }

    /**
     * Calculate current team streak
     */
    calculateCurrentStreak(matches, team) {
        if (matches.length === 0) return { count: 0, type: 'none' };

        const lastResult = matches[matches.length - 1];
        let resultType;
        
        if (team === 'AEK') {
            if (lastResult.aek_goals > lastResult.real_goals) resultType = 'W';
            else if (lastResult.aek_goals === lastResult.real_goals) resultType = 'D';
            else resultType = 'L';
        } else {
            if (lastResult.real_goals > lastResult.aek_goals) resultType = 'W';
            else if (lastResult.real_goals === lastResult.aek_goals) resultType = 'D';
            else resultType = 'L';
        }

        let streakCount = 0;
        for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            let matchResult;
            
            if (team === 'AEK') {
                if (match.aek_goals > match.real_goals) matchResult = 'W';
                else if (match.aek_goals === match.real_goals) matchResult = 'D';
                else matchResult = 'L';
            } else {
                if (match.real_goals > match.aek_goals) matchResult = 'W';
                else if (match.real_goals === match.aek_goals) matchResult = 'D';
                else matchResult = 'L';
            }

            if (matchResult === resultType) {
                streakCount++;
            } else {
                break;
            }
        }

        return {
            count: streakCount,
            type: resultType === 'W' ? 'wins' : resultType === 'L' ? 'losses' : 'draws'
        };
    }

    /**
     * Calculate team comparison metrics
     */
    createTeamComparison(aekStats, realStats) {
        return {
            winRate: {
                aek: parseFloat(aekStats.winRate),
                real: parseFloat(realStats.winRate),
                leader: parseFloat(aekStats.winRate) > parseFloat(realStats.winRate) ? 'AEK' : 'Real'
            },
            goals: {
                aek: aekStats.goalsFor,
                real: realStats.goalsFor,
                leader: aekStats.goalsFor > realStats.goalsFor ? 'AEK' : 'Real'
            },
            defense: {
                aek: aekStats.goalsAgainst,
                real: realStats.goalsAgainst,
                leader: aekStats.goalsAgainst < realStats.goalsAgainst ? 'AEK' : 'Real'
            },
            form: {
                aek: aekStats.form,
                real: realStats.form,
                leader: aekStats.form > realStats.form ? 'AEK' : 'Real'
            },
            squadValue: {
                aek: aekStats.squadValue,
                real: realStats.squadValue,
                leader: aekStats.squadValue > realStats.squadValue ? 'AEK' : 'Real'
            }
        };
    }

    /**
     * Calculate team performance trends
     */
    calculateTeamTrends(matches) {
        const last10Matches = matches.slice(-10);
        const trends = [];

        last10Matches.forEach((match, index) => {
            trends.push({
                match: index + 1,
                aekGoals: match.aek_goals,
                realGoals: match.real_goals,
                date: match.date
            });
        });

        return trends;
    }

    /**
     * Estimate player goals in a match (simplified)
     */
    calculatePlayerGoalsInMatch(match, playerName) {
        // This is a simplified calculation
        // In a real scenario, you'd have detailed match statistics
        const teamPlayers = match.aek_players?.includes(playerName) ? 
            match.aek_players : match.real_players;
        const teamGoals = match.aek_players?.includes(playerName) ? 
            match.aek_goals : match.real_goals;

        if (!teamPlayers || teamPlayers.length === 0) return 0;
        
        // Simple distribution: assume equal contribution unless it's SdS
        const baseBGoals = teamGoals / teamPlayers.length;
        const isMotm = match.manofthematch === playerName;
        
        return Math.round(baseBGoals * (isMotm ? 1.5 : 1));
    }

    /**
     * Calculate assists (simplified)
     */
    calculateAssists(matches, playerName) {
        // Simplified calculation
        // Assumes assists are roughly 30% of team goals when player is present
        return matches.reduce((total, match) => {
            const isInMatch = match.aek_players?.includes(playerName) || 
                             match.real_players?.includes(playerName);
            if (!isInMatch) return total;
            
            const teamGoals = match.aek_players?.includes(playerName) ? 
                match.aek_goals : match.real_goals;
            
            return total + Math.round(teamGoals * 0.3);
        }, 0);
    }

    /**
     * Generate insights and recommendations
     */
    generateInsights(playerStats, teamStats) {
        const insights = [];

        // Player insights
        if (playerStats) {
            if (playerStats.winRate > 70) {
                insights.push({
                    type: 'success',
                    title: 'Starker Spieler',
                    message: `${playerStats.player.name} hat eine ausgezeichnete Siegesrate von ${playerStats.winRate}%`
                });
            }

            if (playerStats.form < 30) {
                insights.push({
                    type: 'warning',
                    title: 'Schwache Form',
                    message: `${playerStats.player.name} zeigt in den letzten Spielen schwache Leistungen`
                });
            }

            if (playerStats.streaks.current >= 3) {
                insights.push({
                    type: 'info',
                    title: 'Serie',
                    message: `${playerStats.player.name} ist auf einer ${playerStats.streaks.current}-Spiele ${playerStats.streaks.type === 'wins' ? 'Sieges' : 'Niederlagen'}serie`
                });
            }
        }

        // Team insights
        if (teamStats) {
            const aek = teamStats.AEK;
            const real = teamStats.Real;

            if (Math.abs(parseFloat(aek.winRate) - parseFloat(real.winRate)) < 5) {
                insights.push({
                    type: 'info',
                    title: 'Ausgeglichenes Duell',
                    message: 'Beide Teams haben eine sehr ähnliche Siegesrate'
                });
            }

            if (aek.form > 80 || real.form > 80) {
                const topTeam = aek.form > real.form ? 'AEK' : 'Real';
                insights.push({
                    type: 'success',
                    title: 'Starke Form',
                    message: `${topTeam} befindet sich in hervorragender Form`
                });
            }
        }

        return insights;
    }

    /**
     * Export data for external use
     */
    exportAnalytics(format = 'json') {
        const data = {
            timestamp: new Date().toISOString(),
            cache: Object.fromEntries(this.cache),
            format: format
        };

        if (format === 'csv') {
            return this.convertToCSV(data);
        }

        return JSON.stringify(data, null, 2);
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        // Basic CSV conversion - can be enhanced
        const headers = ['Metric', 'Value', 'Timestamp'];
        const rows = [headers.join(',')];
        
        for (const [key, value] of Object.entries(data.cache)) {
            if (value.data) {
                rows.push(`"${key}","${JSON.stringify(value.data)}","${value.timestamp}"`);
            }
        }
        
        return rows.join('\n');
    }

    /**
     * Clear analytics cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Export the analytics engine
export const analyticsEngine = new AnalyticsEngine();