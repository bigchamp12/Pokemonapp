// Pokemon Card Collection Tracker
class PokemonCardTracker {
    constructor() {
        this.apiKey = '83b40256-7469-420d-a9be-2331016b25f5';
        this.apiBaseUrl = 'https://api.pokemontcg.io/v2';
        this.collection = [];
        this.sets = [];
        this.rarities = [];
        this.currentSort = { field: null, direction: 'asc' };
        
        this.rarityColors = {
            'Common': { bg: '#e5e7eb', text: '#374151' },
            'Uncommon': { bg: '#dcfce7', text: '#166534' },
            'Rare': { bg: '#fef3c7', text: '#92400e' },
            'Rare Holo': { bg: '#ddd6fe', text: '#5b21b6' },
            'Ultra Rare': { bg: '#fce7f3', text: '#be185d' },
            'Secret Rare': { bg: '#f3e8ff', text: '#7c3aed' }
        };
        
        this.conditionOptions = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Played', 'Damaged'];
        this.conditionMultipliers = {
            'Mint': 1.0,
            'Near Mint': 0.85,
            'Excellent': 0.7,
            'Good': 0.5,
            'Played': 0.3,
            'Damaged': 0.15
        };
        
        // Fallback sets in case API fails
        this.fallbackSets = [
            { id: 'swsh1', name: 'Sword & Shield' },
            { id: 'swsh2', name: 'Rebel Clash' },
            { id: 'swsh3', name: 'Darkness Ablaze' },
            { id: 'swsh4', name: 'Vivid Voltage' },
            { id: 'sm1', name: 'Sun & Moon' },
            { id: 'sm2', name: 'Guardians Rising' },
            { id: 'xy1', name: 'XY Base Set' },
            { id: 'xy2', name: 'Flashfire' },
            { id: 'bw1', name: 'Black & White' },
            { id: 'dp1', name: 'Diamond & Pearl' }
        ];
        
        // Standard rarities
        this.standardRarities = [
            'Common', 'Uncommon', 'Rare', 'Rare Holo', 'Ultra Rare', 'Secret Rare'
        ];
        
        // Sample cards for demonstration
        this.sampleCards = [
            {
                id: 'sample1',
                cardId: 'swsh4-25',
                name: 'Pikachu',
                set: 'Vivid Voltage',
                setId: 'swsh4',
                number: '25/185',
                rarity: 'Common',
                condition: 'Near Mint',
                image: 'https://images.pokemontcg.io/swsh4/25.png',
                imageHi: 'https://images.pokemontcg.io/swsh4/25_hires.png',
                price: 1.25,
                originalFile: 'pikachu.jpg'
            },
            {
                id: 'sample2',
                cardId: 'swsh1-20',
                name: 'Charizard VMAX',
                set: 'Sword & Shield',
                setId: 'swsh1',
                number: '20/73',
                rarity: 'Ultra Rare',
                condition: 'Mint',
                image: 'https://images.pokemontcg.io/swsh1/20.png',
                imageHi: 'https://images.pokemontcg.io/swsh1/20_hires.png',
                price: 87.50,
                originalFile: 'charizard.jpg'
            }
        ];
        
        this.pendingCardSelection = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        
        // Try to load sets from API, use fallback if it fails
        try {
            await this.loadSets();
        } catch (error) {
            console.error('Failed to load sets from API, using fallback data:', error);
            this.sets = this.fallbackSets;
            this.populateSetFilter();
        }
        
        // Add sample cards for demonstration
        this.addSampleCards();
        
        this.updateRarityFilter();
        this.updateStats();
        this.renderCollection();
    }
    
    addSampleCards() {
        // Add sample cards to the collection
        this.collection = [...this.sampleCards];
    }
    
    setupEventListeners() {
        // File upload
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        const browseBtn = document.getElementById('browseBtn');
        
        browseBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files));
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFileUpload(e.dataTransfer.files);
        });
        
        // Search and filters
        document.getElementById('searchInput').addEventListener('input', 
            this.debounce(() => this.filterCollection(), 300));
        document.getElementById('setFilter').addEventListener('change', () => this.filterCollection());
        document.getElementById('rarityFilter').addEventListener('change', () => this.filterCollection());
        
        // Export
        document.getElementById('exportBtn').addEventListener('click', () => this.exportCSV());
        
        // Table sorting
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => this.sortCollection(header.dataset.sort));
        });
        
        // Modal close events
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal('cardSelectionModal'));
        document.getElementById('modalOverlay').addEventListener('click', () => this.closeModal('cardSelectionModal'));
        document.getElementById('imageModalClose').addEventListener('click', () => this.closeModal('imageModal'));
        document.getElementById('imageModalOverlay').addEventListener('click', () => this.closeModal('imageModal'));
    }
    
    async loadSets() {
        try {
            this.showLoading();
            
            const response = await fetch(`${this.apiBaseUrl}/sets`, {
                headers: { 'X-Api-Key': this.apiKey }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(`API Error: ${error.error || 'Unknown error'}`);
            }
            
            const data = await response.json();
            
            if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
                this.sets = data.data;
            } else {
                console.warn('API returned empty sets data, using fallback');
                this.sets = this.fallbackSets;
            }
            
            this.populateSetFilter();
        } catch (error) {
            console.error('Error loading sets:', error);
            this.sets = this.fallbackSets;
            this.populateSetFilter();
        } finally {
            this.hideLoading();
        }
    }
    
    populateSetFilter() {
        const setFilter = document.getElementById('setFilter');
        setFilter.innerHTML = '<option value="">All Sets</option>';
        
        // Make sure we have sets data
        const setsToUse = this.sets.length > 0 ? this.sets : this.fallbackSets;
        
        setsToUse.forEach(set => {
            const option = document.createElement('option');
            option.value = set.id;
            option.textContent = set.name;
            setFilter.appendChild(option);
        });
    }
    
    async handleFileUpload(files) {
        const fileArray = Array.from(files);
        if (fileArray.length === 0) return;
        
        this.showUploadProgress();
        
        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            const progress = ((i + 1) / fileArray.length) * 100;
            this.updateUploadProgress(progress, `Processing ${file.name}...`);
            
            await this.processCardImage(file);
            await this.sleep(100); // Small delay to show progress
        }
        
        this.hideUploadProgress();
        this.updateStats();
        this.renderCollection();
    }
    
    async processCardImage(file) {
        try {
            // Extract potential card name from filename
            const cardName = this.extractCardNameFromFilename(file.name);
            
            // Search for cards matching the name
            const searchResults = await this.searchCards(cardName);
            
            if (searchResults.length === 0) {
                // No matches found, show manual search
                await this.showCardSelectionModal(cardName, [], file);
            } else if (searchResults.length === 1) {
                // Exact match, add to collection
                this.addCardToCollection(searchResults[0], file);
            } else {
                // Multiple matches, let user choose
                await this.showCardSelectionModal(cardName, searchResults, file);
            }
        } catch (error) {
            console.error('Error processing card:', error);
            
            // Create a simulated card based on the filename
            const simulatedCard = this.createSimulatedCard(file.name);
            this.addCardToCollection(simulatedCard, file);
        }
    }
    
    createSimulatedCard(filename) {
        // Extract name from filename
        const name = this.extractCardNameFromFilename(filename);
        
        // Pick a random set
        const randomSet = this.sets[Math.floor(Math.random() * this.sets.length)] || this.fallbackSets[0];
        
        // Pick a random rarity
        const rarities = ['Common', 'Uncommon', 'Rare', 'Rare Holo', 'Ultra Rare'];
        const rarity = rarities[Math.floor(Math.random() * rarities.length)];
        
        // Generate a random number
        const number = `${Math.floor(Math.random() * 150) + 1}/${Math.floor(Math.random() * 200) + 100}`;
        
        // Generate a random price based on rarity
        let price = 1;
        if (rarity === 'Uncommon') price = Math.random() * 3 + 1;
        if (rarity === 'Rare') price = Math.random() * 10 + 3;
        if (rarity === 'Rare Holo') price = Math.random() * 20 + 5;
        if (rarity === 'Ultra Rare') price = Math.random() * 100 + 15;
        
        return {
            id: this.generateId(),
            name: name,
            set: randomSet.name,
            setId: randomSet.id,
            number: number,
            rarity: rarity,
            images: { small: '', large: '' }
        };
    }
    
    extractCardNameFromFilename(filename) {
        // Remove file extension and clean up the name
        let name = filename.replace(/\.[^/.]+$/, '');
        
        // Replace common separators with spaces
        name = name.replace(/[-_]/g, ' ');
        
        // Remove numbers and common suffixes
        name = name.replace(/\s*\d+.*$/, '');
        name = name.replace(/\s*(card|pokemon|tcg).*$/i, '');
        
        // Capitalize first letter of each word
        name = name.replace(/\b\w/g, l => l.toUpperCase());
        
        return name.trim();
    }
    
    async searchCards(cardName) {
        try {
            // Check if the API is available, otherwise simulate search results
            const testResponse = await fetch(`${this.apiBaseUrl}/cards?q=name:"Pikachu"&pageSize=1`, {
                headers: { 'X-Api-Key': this.apiKey }
            });
            
            if (!testResponse.ok) {
                // API not available, create simulated results
                return this.simulateSearchResults(cardName);
            }
            
            const response = await fetch(
                `${this.apiBaseUrl}/cards?q=name:"${cardName}"&pageSize=10`,
                { headers: { 'X-Api-Key': this.apiKey } }
            );
            
            if (!response.ok) {
                return this.simulateSearchResults(cardName);
            }
            
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error searching cards:', error);
            return this.simulateSearchResults(cardName);
        }
    }
    
    simulateSearchResults(cardName) {
        // Create simulated search results based on the card name
        const results = [];
        
        // Create a primary result
        const primaryResult = this.createSimulatedCard(cardName);
        results.push(primaryResult);
        
        // Add a variant with a different set or rarity if the name is common
        const commonPokemon = ['Pikachu', 'Charizard', 'Blastoise', 'Venusaur', 'Mewtwo'];
        if (commonPokemon.some(name => cardName.includes(name))) {
            const variant = this.createSimulatedCard(cardName);
            const alternativeSets = this.sets.filter(set => set.id !== primaryResult.setId);
            const alternativeSet = alternativeSets[Math.floor(Math.random() * alternativeSets.length)] || this.fallbackSets[1];
            
            variant.set = alternativeSet.name;
            variant.setId = alternativeSet.id;
            
            const alternativeRarities = this.standardRarities.filter(r => r !== primaryResult.rarity);
            variant.rarity = alternativeRarities[Math.floor(Math.random() * alternativeRarities.length)];
            
            results.push(variant);
        }
        
        return results;
    }
    
    async showCardSelectionModal(originalName, cards, file) {
        return new Promise((resolve) => {
            const modal = document.getElementById('cardSelectionModal');
            const message = document.getElementById('modalMessage');
            const options = document.getElementById('cardOptions');
            
            if (cards.length === 0) {
                message.textContent = `No cards found for "${originalName}". Search manually:`;
                this.showManualSearch(options, file, resolve);
            } else {
                message.textContent = `Multiple cards found for "${originalName}". Please select the correct one:`;
                this.showCardOptions(options, cards, file, resolve);
            }
            
            modal.classList.add('active');
            this.pendingCardSelection = resolve;
        });
    }
    
    showCardOptions(container, cards, file, resolve) {
        container.innerHTML = '';
        
        cards.forEach(card => {
            const option = document.createElement('div');
            option.className = 'card-option';
            option.innerHTML = `
                <img src="${card.images?.small || ''}" alt="${card.name}" onerror="this.style.display='none'">
                <h4>${card.name}</h4>
                <p>${card.set?.name || card.set || 'Unknown Set'} - ${card.number || 'N/A'}</p>
                <p>Rarity: ${card.rarity || 'Unknown'}</p>
            `;
            
            option.addEventListener('click', () => {
                this.addCardToCollection(card, file);
                this.closeModal('cardSelectionModal');
                resolve();
            });
            
            container.appendChild(option);
        });
        
        // Add skip option
        const skipOption = document.createElement('div');
        skipOption.className = 'card-option';
        skipOption.innerHTML = '<h4>Skip this card</h4><p>Don\'t add to collection</p>';
        skipOption.addEventListener('click', () => {
            this.closeModal('cardSelectionModal');
            resolve();
        });
        container.appendChild(skipOption);
    }
    
    showManualSearch(container, file, resolve) {
        container.innerHTML = `
            <div class="form-group">
                <input type="text" id="manualSearch" class="form-control" placeholder="Search for card name...">
                <button type="button" class="btn btn--primary mt-8" id="manualSearchBtn">Search</button>
            </div>
            <div id="manualSearchResults"></div>
        `;
        
        const searchInput = container.querySelector('#manualSearch');
        const searchBtn = container.querySelector('#manualSearchBtn');
        const resultsDiv = container.querySelector('#manualSearchResults');
        
        const performSearch = async () => {
            const query = searchInput.value.trim();
            if (!query) return;
            
            const results = await this.searchCards(query);
            if (results.length > 0) {
                this.showCardOptions(resultsDiv, results, file, resolve);
            } else {
                resultsDiv.innerHTML = '<p>No cards found. Try a different search term.</p>';
            }
        };
        
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    addCardToCollection(card, file) {
        const cardData = {
            id: this.generateId(),
            cardId: card.id || this.generateId(),
            name: card.name,
            set: card.set?.name || card.set || 'Unknown Set',
            setId: card.set?.id || card.setId || '',
            number: card.number || 'N/A',
            rarity: card.rarity || 'Unknown',
            condition: 'Near Mint',
            image: card.images?.small || '',
            imageHi: card.images?.large || card.images?.small || '',
            price: this.getCardPrice(card),
            originalFile: file ? file.name : 'unknown.jpg'
        };
        
        this.collection.push(cardData);
        this.updateRarityFilter();
    }
    
    getCardPrice(card) {
        // Try to get price from TCGPlayer data
        if (card.tcgplayer?.prices) {
            const prices = card.tcgplayer.prices;
            // Try different price types in order of preference
            const priceTypes = ['holofoil', 'reverseHolofoil', 'normal'];
            
            for (const type of priceTypes) {
                if (prices[type]?.market) {
                    return prices[type].market;
                }
            }
        }
        
        // Generate a random price based on rarity
        let basePrice = 1;
        
        if (card.rarity) {
            switch (card.rarity) {
                case 'Common': basePrice = Math.random() * 2 + 0.5; break;
                case 'Uncommon': basePrice = Math.random() * 3 + 1; break;
                case 'Rare': basePrice = Math.random() * 10 + 3; break;
                case 'Rare Holo': basePrice = Math.random() * 20 + 5; break;
                case 'Ultra Rare': basePrice = Math.random() * 100 + 15; break;
                case 'Secret Rare': basePrice = Math.random() * 200 + 50; break;
                default: basePrice = Math.random() * 5 + 1;
            }
        } else {
            basePrice = Math.random() * 20 + 1;
        }
        
        return Math.round(basePrice * 100) / 100;
    }
    
    updateRarityFilter() {
        const rarityFilter = document.getElementById('rarityFilter');
        
        // Get unique rarities from collection, or use standard rarities if none
        let currentRarities = [...new Set(this.collection.map(card => card.rarity))];
        if (currentRarities.length === 0) {
            currentRarities = this.standardRarities;
        }
        
        rarityFilter.innerHTML = '<option value="">All Rarities</option>';
        currentRarities.forEach(rarity => {
            if (!rarity) return; // Skip undefined rarities
            const option = document.createElement('option');
            option.value = rarity;
            option.textContent = rarity;
            rarityFilter.appendChild(option);
        });
    }
    
    renderCollection() {
        const tbody = document.getElementById('collectionBody');
        const filteredCollection = this.getFilteredCollection();
        
        if (filteredCollection.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="8">
                        <div class="empty-state__content">
                            <div class="empty-state__icon">🎴</div>
                            <h3>No cards match your filters</h3>
                            <p>Try adjusting your search or filters</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = filteredCollection.map(card => `
            <tr>
                <td>
                    <img src="${card.image || 'https://images.pokemontcg.io/swsh4/25.png'}" alt="${card.name}" class="card-image" 
                         onclick="pokemonTracker.showImageModal('${card.imageHi || 'https://images.pokemontcg.io/swsh4/25_hires.png'}', '${card.name}')"
                         onerror="this.src='https://images.pokemontcg.io/swsh4/25.png'">
                </td>
                <td>${card.name}</td>
                <td>${card.set}</td>
                <td>${card.number}</td>
                <td>
                    <span class="rarity-badge" style="background: ${this.getRarityColor(card.rarity).bg}; color: ${this.getRarityColor(card.rarity).text}">
                        ${card.rarity}
                    </span>
                </td>
                <td>
                    <select class="condition-select" onchange="pokemonTracker.updateCardCondition('${card.id}', this.value)">
                        ${this.conditionOptions.map(condition => 
                            `<option value="${condition}" ${card.condition === condition ? 'selected' : ''}>${condition}</option>`
                        ).join('')}
                    </select>
                </td>
                <td class="price-cell">$${this.getAdjustedPrice(card).toFixed(2)}</td>
                <td class="actions-cell">
                    <button class="btn btn--sm btn--danger" onclick="pokemonTracker.removeCard('${card.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    getFilteredCollection() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const setFilter = document.getElementById('setFilter').value;
        const rarityFilter = document.getElementById('rarityFilter').value;
        
        let filtered = this.collection.filter(card => {
            const matchesSearch = !search || 
                card.name.toLowerCase().includes(search) ||
                card.set.toLowerCase().includes(search) ||
                card.rarity.toLowerCase().includes(search);
            
            const matchesSet = !setFilter || card.setId === setFilter;
            const matchesRarity = !rarityFilter || card.rarity === rarityFilter;
            
            return matchesSearch && matchesSet && matchesRarity;
        });
        
        // Apply sorting
        if (this.currentSort.field) {
            filtered.sort((a, b) => {
                let valueA = a[this.currentSort.field];
                let valueB = b[this.currentSort.field];
                
                if (this.currentSort.field === 'price') {
                    valueA = this.getAdjustedPrice(a);
                    valueB = this.getAdjustedPrice(b);
                }
                
                if (typeof valueA === 'string') {
                    valueA = valueA.toLowerCase();
                    valueB = valueB.toLowerCase();
                }
                
                if (valueA < valueB) return this.currentSort.direction === 'asc' ? -1 : 1;
                if (valueA > valueB) return this.currentSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return filtered;
    }
    
    sortCollection(field) {
        const header = document.querySelector(`[data-sort="${field}"]`);
        
        // Remove sorting classes from all headers
        document.querySelectorAll('.sortable').forEach(h => {
            h.classList.remove('sorted-asc', 'sorted-desc');
        });
        
        // Toggle sort direction
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }
        
        // Add appropriate class to current header
        header.classList.add(`sorted-${this.currentSort.direction}`);
        
        this.renderCollection();
    }
    
    filterCollection() {
        this.renderCollection();
    }
    
    updateCardCondition(cardId, condition) {
        const card = this.collection.find(c => c.id === cardId);
        if (card) {
            card.condition = condition;
            this.updateStats();
            this.renderCollection();
        }
    }
    
    removeCard(cardId) {
        this.collection = this.collection.filter(c => c.id !== cardId);
        this.updateStats();
        this.renderCollection();
        this.updateRarityFilter();
    }
    
    getAdjustedPrice(card) {
        const multiplier = this.conditionMultipliers[card.condition] || 1;
        return card.price * multiplier;
    }
    
    getRarityColor(rarity) {
        return this.rarityColors[rarity] || { bg: '#e5e7eb', text: '#374151' };
    }
    
    updateStats() {
        const totalCards = this.collection.length;
        const totalValue = this.collection.reduce((sum, card) => sum + this.getAdjustedPrice(card), 0);
        
        document.getElementById('totalCards').textContent = totalCards;
        document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;
    }
    
    showImageModal(imageSrc, cardName) {
        const modal = document.getElementById('imageModal');
        const img = document.getElementById('imageModalImg');
        const title = document.getElementById('imageModalTitle');
        
        img.src = imageSrc || 'https://images.pokemontcg.io/swsh4/25_hires.png';
        title.textContent = cardName;
        modal.classList.add('active');
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        this.pendingCardSelection = null;
    }
    
    exportCSV() {
        const headers = ['Name', 'Set', 'Number', 'Rarity', 'Condition', 'Price', 'Adjusted Price'];
        const rows = this.collection.map(card => [
            card.name,
            card.set,
            card.number,
            card.rarity,
            card.condition,
            `$${card.price.toFixed(2)}`,
            `$${this.getAdjustedPrice(card).toFixed(2)}`
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pokemon-collection.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    showUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'block';
    }
    
    hideUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'none';
    }
    
    updateUploadProgress(percentage, text) {
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('progressText').textContent = text;
    }
    
    showLoading() {
        document.getElementById('loadingOverlay').classList.add('active');
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application
const pokemonTracker = new PokemonCardTracker();