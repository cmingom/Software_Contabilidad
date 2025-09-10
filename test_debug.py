import pandas as pd

# Crear un archivo Excel simple para debug
data = {
    'ID Entrega': ['E001', 'E002', 'E003'],
    'Nombre Cosecha': ['Cosecha 2025', 'Cosecha 2025', 'Cosecha 2025'],
    'Nombre Campo': ['Campo A', 'Campo A', 'Campo A'],
    'Ceco Campo': ['C001', 'C001', 'C001'],
    'Etiquetas Campo': ['', '', ''],
    'Cuartel': ['Q1', 'Q1', 'Q1'],
    'Ceco Cuartel': ['', '', ''],
    'Etiquetas Cuartel': ['', '', ''],
    'Especie': ['Cherry', 'Cherry', 'Cherry'],
    'Variedad': ['Sweet Heart', 'Sweet Heart', 'Sweet Heart'],
    'Fecha Registro': ['2025-08-01', '2025-08-01', '2025-08-01'],
    'Hora Registro': ['08:00:00', '08:30:00', '09:00:00'],
    'Nombre Trabajador': ['Juan Pérez', 'María García', 'Carlos López'],
    'ID Trabajador': ['001', '002', '003'],
    'Contratista': ['', '', ''],
    'ID Contratista': ['', '', ''],
    'Etiquetas Contratista': ['', '', ''],
    'Envase': ['Basqueta', 'Canasto', 'Caja'],
    'Nro Envases': [1, 2, 3],
    'Peso Real': [10.5, 15.2, 8.7],
    'Peso Teórico': [10.0, 15.0, 9.0],
    'Usuario': ['admin', 'admin', 'admin'],
    'ID Usuario': ['001', '001', '001'],
    'Cuadrilla': ['', '', ''],
    'Código Credencial': ['', '', ''],
    'Código Envase': ['', '', '']
}

df = pd.DataFrame(data)
df.to_excel('test_debug.xlsx', index=False)
print("Archivo test_debug.xlsx creado con 3 filas de datos")
