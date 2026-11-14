// Utilitários para apresentar unidades agrupadas pelo departamento a que
// pertencem. Uma unidade pode estar ligada a sectores de vários departamentos.

export function departamentosDaUnidade(unidade) {
  var deps = [];
  var seccoes = (unidade && unidade.seccoes) || [];
  seccoes.forEach(function (s) {
    var dep = s.departamento;
    if (dep && dep.id && !deps.some(function (d) { return d.id === dep.id; })) deps.push(dep);
  });
  return deps;
}

export function unidadesDoDepartamento(unidades, departamentoId) {
  var lista = Array.isArray(unidades) ? unidades : [];
  if (!departamentoId) return lista;
  return lista.filter(function (u) {
    return departamentosDaUnidade(u).some(function (d) { return d.id === departamentoId; });
  });
}

export function agruparUnidadesPorDepartamento(unidades) {
  var lista = Array.isArray(unidades) ? unidades : [];
  var grupos = [];
  var mapa = {};

  var adicionar = function (chave, nome) {
    if (!mapa[chave]) {
      mapa[chave] = { id: chave, nome: nome, unidades: [] };
      grupos.push(mapa[chave]);
    }
    return mapa[chave];
  };

  lista.forEach(function (u) {
    var deps = departamentosDaUnidade(u);
    if (deps.length === 0) {
      adicionar("sem_departamento", "Sem departamento").unidades.push(u);
      return;
    }
    deps.forEach(function (d) {
      adicionar(d.id, d.nome).unidades.push(u);
    });
  });

  grupos.sort(function (a, b) {
    if (a.id === "sem_departamento") return 1;
    if (b.id === "sem_departamento") return -1;
    return String(a.nome).localeCompare(String(b.nome));
  });
  return grupos;
}
