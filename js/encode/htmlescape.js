function htmlEscape() {
    const input = document.getElementById('htmlInput');
    const output = document.getElementById('htmlOutput');
    const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
    output.textContent = input.value.replace(/[&<>"']/g, (c) => map[c]);
}

function htmlUnescape() {
    const input = document.getElementById('htmlInput');
    const output = document.getElementById('htmlOutput');
    const map = {'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&#x2F;': '/'};
    output.textContent = input.value.replace(/&(?:amp|lt|gt|quot|#39|#x27|#x2F);/g, (m) => map[m] || m);
}
