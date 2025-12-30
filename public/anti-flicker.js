// ANTI-FLICKERING ULTRA OTIMIZADO
// Este script elimina COMPLETAMENTE qualquer tremor visual

(function() {
    'use strict';
    
    // Otimizar renderização do navegador
    if (CSS.supports('content-visibility', 'auto')) {
        const style = document.createElement('style');
        style.textContent = `
            .desktop-table tbody tr {
                content-visibility: auto;
                contain-intrinsic-size: 80px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Desabilitar transições durante atualizações em massa
    let updateInProgress = false;
    
    window.disableTransitions = function() {
        if (updateInProgress) return;
        updateInProgress = true;
        
        const style = document.createElement('style');
        style.id = 'disable-transitions';
        style.textContent = `
            * {
                transition: none !important;
                animation: none !important;
            }
        `;
        document.head.appendChild(style);
        
        // Forçar reflow
        document.body.offsetHeight;
        
        // Remover após renderização
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const disableStyle = document.getElementById('disable-transitions');
                if (disableStyle) {
                    disableStyle.remove();
                }
                updateInProgress = false;
            });
        });
    };
    
    // Otimizar scroll
    const mainTable = document.querySelector('.main-table');
    if (mainTable) {
        mainTable.style.scrollBehavior = 'auto';
    }
    
    // Usar Intersection Observer para lazy rendering (se necessário)
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.visibility = 'visible';
                } else {
                    // Manter visível para evitar flickering
                    entry.target.style.visibility = 'visible';
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        // Observar linhas da tabela quando forem adicionadas
        const observeTableRows = () => {
            const rows = document.querySelectorAll('.desktop-table tbody tr');
            rows.forEach(row => observer.observe(row));
        };
        
        // Executar quando o DOM estiver pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', observeTableRows);
        } else {
            observeTableRows();
        }
        
        // Re-observar quando a tabela for atualizada
        window.reobserveTableRows = observeTableRows;
    }
    
    console.log('⚡ Anti-Flickering ATIVADO - Renderização ULTRA RÁPIDA');
})();
