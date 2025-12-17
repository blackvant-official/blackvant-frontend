// ===== DEPOSIT PAGE FUNCTIONS =====

function initializeDepositPage() {
    // File upload functionality
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const removeFileBtn = document.getElementById('removeFileBtn');
    
    if (uploadArea && fileInput) {
        // Click on upload area to trigger file input
        uploadArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        // Drag and drop functionality
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', function() {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files.length) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
        
        // File input change
        fileInput.addEventListener('change', function(e) {
            if (e.target.files.length) {
                handleFile(e.target.files[0]);
            }
        });
        
        // Remove file
        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                fileInput.value = '';
                filePreview.classList.remove('show');
                fileName.textContent = '';
                validateDepositForm();
            });
        }
        
        function handleFile(file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                alert('Please upload only JPG, PNG, or PDF files.');
                return;
            }
            
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size should be less than 5MB.');
                return;
            }
            
            // Show file preview
            fileName.textContent = file.name;
            filePreview.classList.add('show');
            
            validateDepositForm();
        }
    }
    
    // Copy wallet address functionality
    const copyBtn = document.getElementById('copyAddressBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const textToCopy = this.getAttribute('data-copy');
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalText = this.textContent;
                    this.textContent = 'Copied!';
                    this.style.background = 'var(--accent-green)';
                    
                    setTimeout(() => {
                        this.textContent = originalText;
                        this.style.background = 'var(--accent-blue)';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    alert('Failed to copy text. Please try again.');
                });
            }
        });
    }
    
    // Amount validation
    const amountInput = document.getElementById('amount');
    const minAmount = 100; // Minimum deposit amount
    
    if (amountInput) {
        amountInput.addEventListener('input', validateDepositForm);
    }
    
    // Form submission
    const submitBtn = document.getElementById('submitBtn');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const amount = parseFloat(amountInput.value) || 0;
            const file = fileInput.files[0];
            
            // Validation
            if (amount < minAmount) {
                alert(`Minimum deposit amount is $${minAmount}`);
                return;
            }
            
            if (!file) {
                alert('Please upload proof of payment');
                return;
            }
            
            // Show loading state
            const originalText = this.innerHTML;
            this.innerHTML = '<span class="spinner"></span> Processing...';
            this.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                alert(`Deposit request of $${amount} submitted successfully!\n\nTransaction ID: TX${Date.now()}\nStatus: Pending Review\n\nPlease allow 10-30 minutes for crypto verification.`);
                
                // Reset form
                if (amountInput) amountInput.value = '';
                if (fileInput) fileInput.value = '';
                if (filePreview) filePreview.classList.remove('show');
                if (fileName) fileName.textContent = '';
                
                this.innerHTML = originalText;
                this.disabled = true;
                
                // Scroll to recent deposits
                const recentDeposits = document.querySelector('.recent-deposits');
                if (recentDeposits) {
                    recentDeposits.scrollIntoView({ behavior: 'smooth' });
                }
                
                validateDepositForm();
            }, 1500);
        });
    }
    
    // Initial validation
    validateDepositForm();
}

// Deposit form validation
function validateDepositForm() {
    const amountInput = document.getElementById('amount');
    const amountError = document.getElementById('amountError');
    const submitBtn = document.getElementById('submitBtn');
    const filePreview = document.getElementById('filePreview');
    
    if (!amountInput || !submitBtn) return;
    
    const amount = parseFloat(amountInput.value) || 0;
    const hasFile = filePreview ? filePreview.classList.contains('show') : false;
    const minAmount = 100;

    let isValid = true;

    // Amount validation
    if (!amount || amount < minAmount) {
        if (amountError) {
            amountError.textContent = `Minimum deposit amount is $${minAmount}`;
            amountError.classList.add('show');
        }
        amountInput.classList.add('error');
        isValid = false;
    } else {
        if (amountError) amountError.classList.remove('show');
        amountInput.classList.remove('error');
    }

    // File validation
    if (!hasFile) {
        isValid = false;
    }

    // Enable/disable submit button
    submitBtn.disabled = !isValid;
}

// ===== WITHDRAW PAGE FUNCTIONS =====

function initializeWithdrawPage() {
    // Payment method selection (only crypto now)
    const cryptoOption = document.getElementById('cryptoOption');
    const cryptoForm = document.getElementById('cryptoForm');
    
    if (cryptoOption && cryptoForm) {
        cryptoOption.addEventListener('click', function() {
            // Remove selected class from all options (if there were multiple)
            document.querySelectorAll('.method-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
            
            // Show crypto form
            document.querySelectorAll('.method-form').forEach(form => {
                form.classList.remove('active');
            });
            cryptoForm.classList.add('active');
            
            validateWithdrawForm();
        });
    }
    
    // Amount calculation with 0.5% fee
    const amountInput = document.getElementById('withdrawAmount');
    const feeDisplay = document.getElementById('feeAmount');
    const netDisplay = document.getElementById('netAmount');
    const withdrawFee = 0.005; // 0.5% fee
    
    if (amountInput && feeDisplay && netDisplay) {
        amountInput.addEventListener('input', function() {
            const amount = parseFloat(this.value) || 0;
            const fee = amount * withdrawFee;
            const net = amount - fee;
            
            feeDisplay.textContent = '$' + fee.toFixed(2);
            netDisplay.textContent = '$' + net.toFixed(2);
            
            validateWithdrawForm();
        });
        
        // Trigger calculation on page load
        amountInput.dispatchEvent(new Event('input'));
    }
    
    // Wallet address validation
    const walletAddressInput = document.getElementById('walletAddress');
    if (walletAddressInput) {
        walletAddressInput.addEventListener('input', validateWithdrawForm);
    }
    
    // Form submission
    const submitBtn = document.getElementById('submitBtn');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (!validateWithdrawForm()) {
                alert('Please fill all required fields correctly.');
                return;
            }
            
            const amount = parseFloat(amountInput.value) || 0;
            const walletAddress = walletAddressInput.value;
            const fee = amount * withdrawFee;
            const net = amount - fee;
            const minWithdraw = 10;
            
            // Validation
            if (amount < minWithdraw) {
                alert(`Minimum withdrawal amount is $${minWithdraw}`);
                return;
            }
            
            if (!walletAddress.trim()) {
                alert('Please enter your TRC20 wallet address');
                return;
            }
            
            // Show loading state
            const originalText = this.innerHTML;
            this.innerHTML = '<span class="spinner"></span> Processing...';
            this.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                alert(`✅ Withdrawal request submitted!\n\nAmount: $${amount.toFixed(2)}\nFee (0.5%): $${fee.toFixed(2)}\nNet Amount: $${net.toFixed(2)}\nWallet: ${walletAddress.substring(0, 10)}...\n\nYour withdrawal will be processed within 24-48 hours.`);
                
                // Reset form
                if (amountInput) amountInput.value = '';
                if (walletAddressInput) walletAddressInput.value = '';
                
                // Reset calculations
                if (feeDisplay) feeDisplay.textContent = '$0.00';
                if (netDisplay) netDisplay.textContent = '$0.00';
                
                this.innerHTML = originalText;
                this.disabled = true;
                
                // Scroll to recent withdrawals
                const recentWithdrawals = document.querySelector('.recent-withdrawals');
                if (recentWithdrawals) {
                    recentWithdrawals.scrollIntoView({ behavior: 'smooth' });
                }
                
                validateWithdrawForm();
            }, 1500);
        });
    }
    
    // Initial validation
    validateWithdrawForm();
}

// Withdraw form validation
function validateWithdrawForm() {
    const amountInput = document.getElementById('withdrawAmount');
    const amountError = document.getElementById('amountError');
    const walletAddressInput = document.getElementById('walletAddress');
    const walletAddressError = document.getElementById('walletAddressError');
    const submitBtn = document.getElementById('submitBtn');
    const availableBalance = 784.50; // Example balance
    
    if (!amountInput || !submitBtn) return false;
    
    const amount = parseFloat(amountInput.value) || 0;
    const walletAddress = walletAddressInput ? walletAddressInput.value.trim() : '';
    const minWithdraw = 10;

    let isValid = true;

    // Amount validation
    if (!amount || amount < minWithdraw) {
        if (amountError) {
            amountError.textContent = `Minimum withdrawal amount is $${minWithdraw}`;
            amountError.classList.add('show');
        }
        amountInput.classList.add('error');
        isValid = false;
    } else if (amount > availableBalance) {
        if (amountError) {
            amountError.textContent = `Amount exceeds available balance ($${availableBalance})`;
            amountError.classList.add('show');
        }
        amountInput.classList.add('error');
        isValid = false;
    } else {
        if (amountError) amountError.classList.remove('show');
        amountInput.classList.remove('error');
    }

    // Wallet address validation
    if (!walletAddress) {
        if (walletAddressError) {
            walletAddressError.textContent = 'Valid TRC20 address is required';
            walletAddressError.classList.add('show');
        }
        if (walletAddressInput) walletAddressInput.classList.add('error');
        isValid = false;
    } else {
        if (walletAddressError) walletAddressError.classList.remove('show');
        if (walletAddressInput) walletAddressInput.classList.remove('error');
    }

    // Enable/disable submit button
    submitBtn.disabled = !isValid;
    return isValid;
}

// ===== INITIALIZE TRANSACTIONS PAGES =====
document.addEventListener('DOMContentLoaded', function() {
    // Check which page we're on and initialize accordingly
    if (document.querySelector('.deposit-content')) {
        initializeDepositPage();
            // Copy wallet address functionality
    const copyBtn = document.getElementById('copyAddressBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const textToCopy = this.getAttribute('data-copy');
            const button = this;
            if (!textToCopy) return;

            const originalText = button.textContent;
            const originalBg = button.style.background;

            function onSuccess() {
                button.textContent = 'Copied!';
                button.style.background = 'var(--accent-green)';

                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = originalBg || 'var(--accent-blue)';
                }, 2000);
            }

            function fallbackCopy() {
                try {
                    const textarea = document.createElement('textarea');
                    textarea.value = textToCopy;
                    textarea.setAttribute('readonly', '');
                    textarea.style.position = 'fixed';
                    textarea.style.left = '-9999px';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    onSuccess();
                } catch (err) {
                    console.error('Fallback copy failed:', err);
                    alert('Failed to copy text. Please copy manually.');
                }
            }

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(textToCopy)
                    .then(onSuccess)
                    .catch(err => {
                        console.error('Clipboard API failed, using fallback:', err);
                        fallbackCopy();
                    });
            } else {
                fallbackCopy();
            }
        });
    }

    }
    
    if (document.querySelector('.withdraw-content')) {
        initializeWithdrawPage();
    }
});