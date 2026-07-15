table.appendChild(tbody);

const levelHeadersBlock =
  window.tableLevelHeaders?.build?.(rows);

if (levelHeadersBlock?.position === "top") {
  wrap.appendChild(levelHeadersBlock.el);
  wrap.appendChild(table);
} else if (levelHeadersBlock?.position === "left") {
  const layout = document.createElement("div");
  layout.className = "table-with-level-headers";

  layout.appendChild(levelHeadersBlock.el);
  layout.appendChild(table);

  wrap.appendChild(layout);
} else {
  wrap.appendChild(table);
}

host.appendChild(wrap);