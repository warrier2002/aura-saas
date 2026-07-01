        // Detect environment prefix from URL path (/dev, /staging, or / for prod)
        const envMatch = window.location.pathname.match(/^\/(dev|staging)/);
        const ENV_PREFIX = envMatch ? '/' + envMatch[1] : '';
        const API_BASE = ENV_PREFIX + '/api';

        // Environment badge
        (function() {
            const badge = document.getElementById('env-badge');
            if (envMatch) {
                const env = envMatch[1];
                badge.textContent = env.charAt(0).toUpperCase() + env.slice(1);
                badge.classList.add(env);
            } else {
                badge.textContent = 'Prod';
                badge.classList.add('prod');
            }
        })();

        const loginView = document.getElementById('login-view');
        const dashboardView = document.getElementById('dashboard');
        const loginAlert = document.getElementById('login-alert');
        const dashAlert = document.getElementById('dash-alert');

        function showAlert(element, msg, type) {
            element.textContent = msg;
            element.className = `alert ${type}`;
            element.style.display = 'block';
            setTimeout(() => { element.style.display = 'none'; }, 4000);
        }

        function getAuthHeader() {
            const token = sessionStorage.getItem('aura_token');
            return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        }

        // --- Auth Logic ---
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const tenant_id = document.getElementById('tenant').value;

            try {
                const res = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, tenant_id })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Login failed');

                sessionStorage.setItem('aura_token', data.token);
                sessionStorage.setItem('aura_user', JSON.stringify(data.user));

                showDashboard();
            } catch (err) {
                showAlert(loginAlert, err.message, 'error');
            }
        });

        // --- Tab Switching Logic ---
        let hpaInterval = null;

        function switchTab(tabId) {
            // Update active button state
            document.querySelectorAll('.sidebar-tab').forEach(btn => btn.classList.remove('active'));
            const activeBtn = document.getElementById(`tab-btn-${tabId}`);
            if (activeBtn) activeBtn.classList.add('active');

            // Update active panel state
            document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
            const activePanel = document.getElementById(`panel-${tabId}`);
            if (activePanel) activePanel.classList.add('active');

            // Trigger specific actions when switching tabs
            if (tabId === 'autoscaling') {
                fetchHPAStatus();
            }
        }

        // --- Dashboard Logic ---
        async function showDashboard() {
            loginView.style.display = 'none';
            dashboardView.style.display = 'block';

            const user = JSON.parse(sessionStorage.getItem('aura_user'));
            document.getElementById('user-info').textContent = `${user.name} (${user.tenant_id.replace('_', ' ').toUpperCase()})`;

            await fetchCustomers();
            await fetchContacts();

            // Start polling HPA Status
            if (hpaInterval) clearInterval(hpaInterval);
            fetchHPAStatus();
            hpaInterval = setInterval(fetchHPAStatus, 5000);
        }

        function logout() {
            if (hpaInterval) {
                clearInterval(hpaInterval);
                hpaInterval = null;
            }
            sessionStorage.removeItem('aura_token');
            sessionStorage.removeItem('aura_user');
            loginView.style.display = 'block';
            dashboardView.style.display = 'none';
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
        }

        // --- Customer Logic ---
        async function fetchCustomers() {
            try {
                const res = await fetch(`${API_BASE}/customers`, { headers: getAuthHeader() });
                if (res.status === 401) return logout(); // Token expired

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                const tbody = document.getElementById('customer-list');
                tbody.innerHTML = '';

                // Also populate the Customer drop-down select inside Contacts form
                const select = document.getElementById('contact-customer-id');
                select.innerHTML = '<option value="">Select a Customer...</option>';

                if (!data.customers || data.customers.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#7A7A8C;">No customers found.</td></tr>`;
                    return;
                }

                data.customers.forEach(c => {
                    // Populate select list
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    select.appendChild(opt);

                    // Populate table
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <div style="font-weight:600; color:#1A1A2E;">${escapeHTML(c.name)}</div>
                            <div style="font-size:0.8rem; color:#7A7A8C;">${escapeHTML(c.email || '—')}</div>
                        </td>
                        <td>${escapeHTML(c.company || '—')}</td>
                        <td style="text-align:center;">
                            <button class="btn-delete" onclick="deleteCustomer(${c.id}, '${escapeHTML(c.name)}')">Delete</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) {
                showAlert(dashAlert, 'Failed to fetch directory', 'error');
            }
        }

        document.getElementById('customer-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('cust-name').value;
            const email = document.getElementById('cust-email').value;
            const company = document.getElementById('cust-company').value;

            try {
                const res = await fetch(`${API_BASE}/customers`, {
                    method: 'POST',
                    headers: getAuthHeader(),
                    body: JSON.stringify({ name, email, company })
                });

                if (res.status === 401) return logout();
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                showAlert(dashAlert, 'Customer added successfully', 'success');
                document.getElementById('customer-form').reset();
                await fetchCustomers();
            } catch (err) {
                showAlert(dashAlert, err.message, 'error');
            }
        });

        async function deleteCustomer(id, name) {
            if (!confirm(`Are you sure you want to delete customer "${name}"?\nWARNING: All associated contacts will also be deleted.`)) {
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/customers/${id}`, {
                    method: 'DELETE',
                    headers: getAuthHeader()
                });

                if (res.status === 401) return logout();
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                showAlert(dashAlert, 'Customer deleted successfully', 'success');
                await fetchCustomers();
                await fetchContacts();
            } catch (err) {
                showAlert(dashAlert, err.message, 'error');
            }
        }

        // --- Contacts Logic ---
        async function fetchContacts() {
            try {
                const res = await fetch(`${API_BASE}/contacts`, { headers: getAuthHeader() });
                if (res.status === 401) return logout();

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                const tbody = document.getElementById('contacts-list');
                tbody.innerHTML = '';

                if (!data.contacts || data.contacts.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#7A7A8C;">No contacts found.</td></tr>`;
                    return;
                }

                data.contacts.forEach(c => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <div style="font-weight:600; color:#1A1A2E;">${escapeHTML(c.name)}</div>
                            <div style="font-size:0.8rem; color:#7A7A8C;">${escapeHTML(c.email || '—')} &bull; ${escapeHTML(c.phone || '—')}</div>
                        </td>
                        <td>
                            <div style="font-weight:600; color:#1A1A2E;">${escapeHTML(c.customer_name || 'Unassigned')}</div>
                            <div style="font-size:0.8rem; color:#7A7A8C;">Role: ${escapeHTML(c.role || '—')}</div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) {
                showAlert(dashAlert, 'Failed to fetch contacts directory', 'error');
            }
        }

        document.getElementById('contact-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const customer_id = document.getElementById('contact-customer-id').value;
            const name = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const phone = document.getElementById('contact-phone').value;
            const role = document.getElementById('contact-role').value;

            try {
                const res = await fetch(`${API_BASE}/contacts`, {
                    method: 'POST',
                    headers: getAuthHeader(),
                    body: JSON.stringify({ customer_id, name, email, phone, role })
                });

                if (res.status === 401) return logout();
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                showAlert(dashAlert, 'Contact added successfully', 'success');
                document.getElementById('contact-form').reset();
                await fetchContacts();
            } catch (err) {
                showAlert(dashAlert, err.message, 'error');
            }
        });

        // --- HPA Scaling Logic ---
        async function fetchHPAStatus() {
            try {
                const res = await fetch(`${API_BASE}/hpa-status`);
                if (!res.ok) throw new Error('HPA fetch failed');
                const data = await res.json();

                // Render metrics
                document.getElementById('hpa-replica-count').textContent = `${data.readyReplicas} / ${data.replicas}`;
                
                let modeText = 'Local (Mock)';
                if (data.mode === 'k8s') modeText = 'Kubernetes Active';
                else if (data.mode.startsWith('k8s-error')) modeText = 'K8s (RBAC Restricted)';
                document.getElementById('hpa-mode').textContent = modeText;

                // Render pod visualizer pills
                const container = document.getElementById('pods-container');
                container.innerHTML = '';

                for (let i = 1; i <= data.replicas; i++) {
                    const pod = document.createElement('div');
                    pod.className = `pod-pill ${i <= data.readyReplicas ? 'active' : ''}`;
                    pod.innerHTML = `
                        <span class="pod-icon"></span>
                        aura-saas-backend-${i}
                    `;
                    container.appendChild(pod);
                }
            } catch (err) {
                console.error('HPA polling error:', err);
            }
        }

        // XSS Prevention helper
        function escapeHTML(str) {
            if (!str) return '';
            return str.replace(/[&<>'"]/g,
                tag => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    "'": '&#39;',
                    '"': '&quot;'
                }[tag])
            );
        }

        // Initial check
        if (sessionStorage.getItem('aura_token')) {
            showDashboard();
        }

        // Expose to window for inline HTML onclick handlers
        window.logout = logout;
        window.switchTab = switchTab;
        window.deleteCustomer = deleteCustomer;
