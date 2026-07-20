// SES Search Manager
class SESSearchManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.regions = [
            'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
            'us-gov-east-1', 'us-gov-west-1',
            'ap-south-1', 'ap-south-2', 'ap-southeast-1', 'ap-southeast-2',
            'ap-southeast-3', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
            'ca-central-1', 'eu-central-1', 'eu-west-1', 'eu-west-2',
            'eu-west-3', 'eu-north-1', 'eu-south-1', 'eu-south-2',
            'il-central-1', 'me-south-1', 'me-central-1',
            'sa-east-1', 'af-south-1'
        ];
        this.currentSearch = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const searchBtn = document.getElementById('search-btn');
        const clearBtn = document.getElementById('clear-btn');
        const emailInput = document.getElementById('email-input');
        const exportBtn = document.getElementById('export-btn');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSearch());
        }

        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });

            emailInput.addEventListener('input', (e) => {
                this.validateEmail(e.target.value);
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportResults());
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailInput = document.getElementById('email-input');
        
        if (email && !emailRegex.test(email)) {
            emailInput.style.borderColor = '#dc3545';
            return false;
        } else {
            emailInput.style.borderColor = '#e1e5e9';
            return true;
        }
    }

    async performSearch() {
        const emailInput = document.getElementById('email-input');
        const searchType = document.getElementById('search-type');
        
        const email = emailInput.value.trim();
        const type = searchType.value;

        // Validation
        if (!email) {
            this.showError('Please enter an email address');
            emailInput.focus();
            return;
        }

        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address');
            emailInput.focus();
            return;
        }

        if (!this.authManager.isUserAuthenticated()) {
            this.showError('Please login first');
            return;
        }

        // Start search
        this.showLoading();
        this.showRegionStatus();
        
        try {
            const results = await this.searchAllRegions(email, type);
            this.displayResults(results);
        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Search failed. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async searchAllRegions(email, searchType) {
        const results = {
            email: email,
            searchType: searchType,
            timestamp: new Date().toISOString(),
            totalRegions: this.regions.length,
            regionsSearched: 0,
            regionsWithData: 0,
            totalSuppressions: 0,
            regionResults: []
        };

        // Initialize region status
        this.initializeRegionGrid();

        // Search regions in batches
        const batchSize = 5;
        for (let i = 0; i < this.regions.length; i += batchSize) {
            const batch = this.regions.slice(i, i + batchSize);
            const batchPromises = batch.map(region => this.searchRegion(email, region, searchType));
            
            const batchResults = await Promise.all(batchPromises);
            
            batchResults.forEach(regionResult => {
                results.regionResults.push(regionResult);
                results.regionsSearched++;
                
                if (regionResult.suppressions && regionResult.suppressions.length > 0) {
                    results.regionsWithData++;
                    results.totalSuppressions += regionResult.suppressions.length;
                }
                
                this.updateRegionStatus(regionResult.region, regionResult.status, regionResult.suppressions?.length || 0);
            });

            // Update progress
            const progress = (results.regionsSearched / results.totalRegions) * 100;
            this.updateProgress(progress);
            
            // Small delay between batches
            if (i + batchSize < this.regions.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        this.currentSearch = results;
        return results;
    }

    async searchRegion(email, region, searchType) {
        const regionResult = {
            region: region,
            status: 'searching',
            suppressions: [],
            error: null,
            searchTime: new Date().toISOString()
        };

        try {
            // Update status to searching
            this.updateRegionStatus(region, 'searching');
            
            // Simulate API call (in real implementation, this would call your Lambda function)
            const response = await this.simulateAPICall(email, region, searchType);
            
            regionResult.suppressions = response.suppressions || [];
            regionResult.status = regionResult.suppressions.length > 0 ? 'found' : 'not-found';
            
        } catch (error) {
            regionResult.status = 'error';
            regionResult.error = error.message;
        }

        return regionResult;
    }

    async simulateAPICall(email, region, searchType) {
        // Simulate network delay
        const delay = Math.random() * 1000 + 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Simulate finding suppressions (20% chance)
        const hasResult = Math.random() > 0.8;
        
        if (hasResult) {
            const reasons = ['BOUNCE', 'COMPLAINT'];
            let reason;
            
            if (searchType === 'all') {
                reason = reasons[Math.floor(Math.random() * reasons.length)];
            } else {
                reason = searchType.toUpperCase();
            }
            
            return {
                suppressions: [{
                    emailAddress: email,
                    reason: reason,
                    lastUpdateTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                    region: region
                }]
            };
        }
        
        return { suppressions: [] };
    }

    initializeRegionGrid() {
        const regionGrid = document.getElementById('region-grid');
        if (!regionGrid) return;

        regionGrid.innerHTML = '';
        
        this.regions.forEach(region => {
            const regionItem = document.createElement('div');
            regionItem.className = 'region-item pending';
            regionItem.id = `region-${region}`;
            regionItem.textContent = region;
            regionGrid.appendChild(regionItem);
        });
    }

    updateRegionStatus(region, status, count = 0) {
        const regionItem = document.getElementById(`region-${region}`);
        if (!regionItem) return;

        regionItem.className = `region-item ${status}`;
        
        if (status === 'found' && count > 0) {
            regionItem.textContent = `${region} (${count})`;
        } else {
            regionItem.textContent = region;
        }
    }

    showLoading() {
        const loading = document.getElementById('loading');
        const searchBtn = document.getElementById('search-btn');
        const resultsContainer = document.getElementById('results-container');

        if (loading) loading.style.display = 'block';
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        }
        if (resultsContainer) resultsContainer.style.display = 'none';

        this.updateProgress(0);
        this.updateLoadingStatus('Initializing search across all regions...');
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        const searchBtn = document.getElementById('search-btn');

        if (loading) loading.style.display = 'none';
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<i class="fas fa-search"></i> Search All Regions';
        }
    }

    showRegionStatus() {
        const regionStatus = document.getElementById('region-status');
        if (regionStatus) regionStatus.style.display = 'block';
    }

    updateProgress(percentage) {
        const progress = document.getElementById('progress');
        const progressText = document.getElementById('progress-text');

        if (progress) progress.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `${Math.round(percentage)}%`;

        // Update loading status based on progress
        if (percentage < 25) {
            this.updateLoadingStatus('Starting search in first batch of regions...');
        } else if (percentage < 50) {
            this.updateLoadingStatus('Searching additional regions...');
        } else if (percentage < 75) {
            this.updateLoadingStatus('Completing search in remaining regions...');
        } else if (percentage < 100) {
            this.updateLoadingStatus('Finalizing results...');
        }
    }

    updateLoadingStatus(status) {
        const loadingStatus = document.getElementById('loading-status');
        if (loadingStatus) loadingStatus.textContent = status;
    }

    displayResults(results) {
        const resultsContainer = document.getElementById('results-container');
        const resultsSummary = document.getElementById('results-summary');
        const resultsTable = document.getElementById('results-table');

        if (!resultsContainer || !resultsSummary || !resultsTable) return;

        // Show results container
        resultsContainer.style.display = 'block';

        // Create summary
        this.createResultsSummary(results, resultsSummary);

        // Create results table
        this.createResultsTable(results, resultsTable);

        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    createResultsSummary(results, container) {
        const suppressions = results.regionResults
            .filter(r => r.suppressions && r.suppressions.length > 0)
            .flatMap(r => r.suppressions);

        container.innerHTML = `
            <h4><i class="fas fa-chart-bar"></i> Search Summary for: ${results.email}</h4>
            <div class="summary-stats">
                <div class="stat-card">
                    <div class="number">${results.totalRegions}</div>
                    <div class="label">Regions Searched</div>
                </div>
                <div class="stat-card">
                    <div class="number">${results.regionsWithData}</div>
                    <div class="label">Regions with Suppressions</div>
                </div>
                <div class="stat-card">
                    <div class="number">${results.totalSuppressions}</div>
                    <div class="label">Total Suppressions</div>
                </div>
                <div class="stat-card">
                    <div class="number">${suppressions.filter(s => s.reason === 'BOUNCE').length}</div>
                    <div class="label">Bounces</div>
                </div>
                <div class="stat-card">
                    <div class="number">${suppressions.filter(s => s.reason === 'COMPLAINT').length}</div>
                    <div class="label">Complaints</div>
                </div>
            </div>
        `;
    }

    createResultsTable(results, container) {
        const suppressions = results.regionResults
            .filter(r => r.suppressions && r.suppressions.length > 0)
            .flatMap(r => r.suppressions);

        if (suppressions.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-check-circle"></i>
                    <h4>No Suppressions Found</h4>
                    <p>The email address "${results.email}" was not found in any suppression lists across all ${results.totalRegions} AWS regions.</p>
                    <small>This means the email address is not currently suppressed and can receive emails via Amazon SES.</small>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th><i class="fas fa-envelope"></i> Email Address</th>
                        <th><i class="fas fa-globe"></i> Region</th>
                        <th><i class="fas fa-exclamation-triangle"></i> Reason</th>
                        <th><i class="fas fa-clock"></i> Last Updated</th>
                    </tr>
                </thead>
                <tbody>
                    ${suppressions.map(s => `
                        <tr>
                            <td>${s.emailAddress}</td>
                            <td><code>${s.region}</code></td>
                            <td><span class="status-${s.reason.toLowerCase()}">${s.reason}</span></td>
                            <td>${new Date(s.lastUpdateTime).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;
    }

    clearSearch() {
        const emailInput = document.getElementById('email-input');
        const resultsContainer = document.getElementById('results-container');
        const regionStatus = document.getElementById('region-status');
        const searchType = document.getElementById('search-type');

        if (emailInput) {
            emailInput.value = '';
            emailInput.style.borderColor = '#e1e5e9';
        }
        if (resultsContainer) resultsContainer.style.display = 'none';
        if (regionStatus) regionStatus.style.display = 'none';
        if (searchType) searchType.value = 'all';

        this.currentSearch = null;
    }

    exportResults() {
        if (!this.currentSearch) {
            this.showError('No search results to export');
            return;
        }

        const suppressions = this.currentSearch.regionResults
            .filter(r => r.suppressions && r.suppressions.length > 0)
            .flatMap(r => r.suppressions);

        if (suppressions.length === 0) {
            this.showError('No suppressions found to export');
            return;
        }

        // Create CSV content
        const headers = ['Email Address', 'Region', 'Reason', 'Last Updated'];
        const csvContent = [
            headers.join(','),
            ...suppressions.map(s => [
                s.emailAddress,
                s.region,
                s.reason,
                new Date(s.lastUpdateTime).toISOString()
            ].join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ses-suppressions-${this.currentSearch.email}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showSuccess('Results exported successfully!');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Use the same notification system as AuthManager
        if (this.authManager && this.authManager.showNotification) {
            this.authManager.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}
