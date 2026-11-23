# Extrai TODOS os nomes de icones usados no codigo: texto directo dentro de
# <span class="material-symbols-outlined...">...</span>, valores icon:/icone:
# e qualquer string entre aspas com formato de nome de icone.
import os
import re
import sys

RAIZ = sys.argv[1]
SAIDA = sys.argv[2]

padrao_span = re.compile(
    r'<span\b[^>]*className=\s*(?:["\'][^"\']*material-symbols-outlined[^"\']*["\']|\{[^{}]*material-symbols-outlined[^{}]*\})[^>]*>(.*?)</span>',
    re.S,
)
padrao_nome = re.compile(r"^[a-z][a-z0-9_]{2,31}$")
padrao_string = re.compile(r"[\"'][a-z][a-z0-9_]{2,31}[\"']")
padrao_prop = re.compile(r'(?:icon|icone|iconName|iconeNome)\s*[:=]\s*["\'][a-z0-9_]{2,31}["\']', re.I)

nomes = set()
ficheiros = []
for pasta, _, ficheiros_dir in os.walk(RAIZ):
    if "node_modules" in pasta or ".next" in pasta:
        continue
    for nome in ficheiros_dir:
        if nome.endswith((".js", ".jsx")):
            ficheiros.append(os.path.join(pasta, nome))

for caminho in ficheiros:
    with open(caminho, encoding="utf-8") as f:
        texto = f.read()
    for m in padrao_span.finditer(texto):
        dentro = m.group(1)
        if "{" in dentro:
            # expressoes condicionais: apanha as strings citadas la dentro
            for s in padrao_string.finditer(dentro):
                valor = s.group(0)[1:-1]
                if padrao_nome.match(valor):
                    nomes.add(valor)
        else:
            valor = dentro.strip()
            if padrao_nome.match(valor):
                nomes.add(valor)
    for s in padrao_string.finditer(texto):
        valor = s.group(0)[1:-1]
        if padrao_nome.match(valor):
            nomes.add(valor)
    for m in padrao_prop.finditer(texto):
        valor = re.search(r'["\']([a-z0-9_]{2,31})["\']', m.group(0)).group(1)
        nomes.add(valor)

with open(SAIDA, "w", encoding="utf-8") as f:
    f.write("\n".join(sorted(nomes)) + "\n")
print("nomes extraidos:", len(nomes))
