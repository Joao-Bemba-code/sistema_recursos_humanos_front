# Reduz a fonte Material Symbols Outlined aos icones usados no codigo do SGHR.
# Mantem as ligaduras (GSUB rlig) e os eixos variaveis (wght/FILL/GRAD/opsz).
#
# Como regenerar quando entrarem icones novos (a partir da raiz do frontend):
#   1. descarregar a fonte completa: abrir o CSS do Google Fonts
#      (family=Material+Symbols+Outlined com os eixos 20..48,100..700,0..1,-50..200)
#      e guardar o woff2 referenciado em public/fonts/material-symbols/original.woff2
#   2. python scripts/extrair_icones.py src candidatos.txt
#   3. python scripts/subset_ms.py public/fonts/material-symbols/original.woff2 candidatos.txt public/fonts/material-symbols/material-symbols-outlined.woff2 relatorio.txt
#   4. apagar original.woff2 e ver o relatorio.txt
import sys
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options


def ligaduras(font):
    cmap = font.getBestCmap()
    glyph_para_char = {}
    for cp, g in cmap.items():
        if cp <= 0xFFFF and g not in glyph_para_char:
            glyph_para_char[g] = chr(cp)
    ligs = {}
    if "GSUB" not in font:
        return ligs

    def colher_lookup(lookup):
        if lookup.LookupType == 7:  # extensao: o tipo real esta dentro
            for st in lookup.SubTable:
                sub = st.ExtSubTable
                if not isinstance(sub, (list, tuple)):
                    sub = [sub]
                colher_lookup_type(st.ExtensionLookupType, sub)
            return
        colher_lookup_type(lookup.LookupType, lookup.SubTable)

    def colher_lookup_type(tipo, subtabelas):
        if tipo == 7:
            for st in subtabelas:
                colher_lookup_type(st.ExtensionLookupType, st.ExtSubTable)
            return
        if tipo != 4:
            return
        for st in subtabelas:
            try:
                items = st.ligatures.items()
            except AttributeError:
                continue
            for primeiro, lista in items:
                for lig in lista:
                    comps = [primeiro] + list(lig.Component)
                    texto = "".join(glyph_para_char.get(g, "") for g in comps)
                    if texto:
                        ligs.setdefault(texto.lower(), set()).add(lig.LigGlyph)

    for lookup in font["GSUB"].table.LookupList.Lookup:
        colher_lookup(lookup)
    return ligs


def principal(caminho_fonte, caminho_candidatos, caminho_saida, caminho_relatorio):
    font = TTFont(caminho_fonte)
    ligs = ligaduras(font)
    cmap = font.getBestCmap()
    nome_para_cp = {}
    for cp, g in cmap.items():
        nome_para_cp.setdefault(g, cp)

    with open(caminho_candidatos, encoding="utf-8") as f:
        candidatos = [l.strip() for l in f if l.strip()]

    usados = {c: ligs[c.lower()] for c in candidatos if c.lower() in ligs}

    glyphs_icons = set()
    for gs in usados.values():
        glyphs_icons.update(gs)

    # Pre-filtro do GSUB: manter apenas as ligaduras usadas. Sem isto, a
    # clausura do subsetter arrasta todas as 4319 ligaduras (todas usam
    # letras/digitos ASCII como componentes, e o seed contem ASCII completo).
    def filtrar_gsub(lookup):
        if lookup.LookupType == 7:
            for ext in lookup.SubTable:
                filtrar_tipo4(ext.ExtSubTable)
            return
        if lookup.LookupType == 4:
            for st in lookup.SubTable:
                filtrar_tipo4(st)

    def filtrar_tipo4(st):
        if not hasattr(st, "ligatures"):
            return
        novas = {}
        for primeira, seqs in st.ligatures.items():
            filtradas = [seq for seq in seqs if seq.LigGlyph in glyphs_icons]
            if filtradas:
                novas[primeira] = filtradas
        st.ligatures = novas

    if "GSUB" in font:
        for lookup in font["GSUB"].table.LookupList.Lookup:
            filtrar_gsub(lookup)

    # Glifos das letras/digitos que compoem as ligaduras (precisam de existir
    # para a substituicao 'liga' funcionar).
    chars_componentes = set()
    for c in usados:
        chars_componentes.update(c)
    glyphs_componentes = set()
    for ch in chars_componentes:
        g = cmap.get(ord(ch))
        if g:
            glyphs_componentes.add(g)

    # Codepoints dos glifos dos icones (para o cmap da fonte de saida).
    cps_icons = set()
    for g in glyphs_icons:
        if g in nome_para_cp:
            cps_icons.add(nome_para_cp[g])

    # ASCII imprimivel: texto de seguranca se alguma ligadura falhar.
    unicodes = set(range(0x20, 0x7F)) | cps_icons

    opcoes = Options()
    opcoes.layout_features = ["rlig", "rclt"]  # as ligaduras dos icones estao em rlig
    opcoes.name_IDs = ["*"]
    opcoes.name_languages = ["*"]
    opcoes.notdef_outline = True
    opcoes.recommended_glyphs = True
    opcoes.recalc_bounds = True
    opcoes.flavor = "woff2"

    sub = Subsetter(opcoes)
    sub.populate(unicodes=sorted(unicodes), glyphs=glyphs_icons | glyphs_componentes)
    sub.subset(font)
    font.save(caminho_saida)

    # Verificacao: as ligaduras usadas continuam a resolver na fonte de saida.
    saida = TTFont(caminho_saida)
    ligs_saida = ligaduras(saida)
    faltam = [c for c in sorted(usados) if c.lower() not in ligs_saida]

    import os
    tamanho = os.path.getsize(caminho_saida)
    linhas = [
        "Candidatos: %d | Usados como ligadura: %d" % (len(candidatos), len(usados)),
        "Glifos de icones mantidos: %d" % len(glyphs_icons),
        "Tamanho do subset: %.0f KB (original: %.0f KB)" % (tamanho / 1024, os.path.getsize(caminho_fonte) / 1024),
        "Ligaduras em falta apos subset: %s" % (", ".join(faltam) if faltam else "nenhuma"),
    ]
    with open(caminho_relatorio, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas) + "\n")
    print("\n".join(linhas))


if __name__ == "__main__":
    principal(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
