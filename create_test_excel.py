import pandas as pd

# Crear datos de prueba simples
data = {
    'ID entrega': ['test1', 'test2', 'test3'],
    'Nombre cosecha': ['Test 2025', 'Test 2025', 'Test 2025'],
    'Nombre campo': ['Campo A', 'Campo A', 'Campo A'],
    'Ceco campo': ['CC001', 'CC001', 'CC001'],
    'Etiquetas campo': ['Listo', 'Listo', 'Listo'],
    'Cuartel': ['Block 1', 'Block 1', 'Block 1'],
    'Ceco cuartel': ['', '', ''],
    'Etiquetas cuartel': ['', '', ''],
    'Especie': ['Cherry', 'Cherry', 'Cherry'],
    'Variedad': ['Staccato', 'Staccato', 'Staccato'],
    'Fecha registro': ['2025-08-25', '2025-08-25', '2025-08-25'],
    'Hora registro': ['18:20:00', '18:19:57', '18:19:55'],
    'Nombre trabajador': ['Juan Pérez', 'María García', 'Carlos López'],
    'ID trabajador': ['001', '002', '003'],
    'Contratista': ['', '', ''],
    'ID contratista': ['', '', ''],
    'Etiquetas contratista': ['', '', ''],
    'Envase': ['Basqueta', 'Canasto', 'Caja'],
    'Nro envases': [1, 2, 3],
    'Peso real': [0, 0, 0],
    'Peso teorico': [19, 19, 19],
    'Usuario': ['admin', 'admin', 'admin'],
    'ID usuario': ['001', '001', '001'],
    'Cuadrilla': ['', '', ''],
    'Código de credencial utilizada en la entrega': ['AAA0001', 'AAA0002', 'AAA0003'],
    'Código de envase': ['ENV001', 'ENV002', 'ENV003']
}

df = pd.DataFrame(data)
df.to_excel('test_simple.xlsx', index=False)
print('Archivo Excel de prueba creado: test_simple.xlsx')
print(f'Filas: {len(df)}')
print(f'Columnas: {len(df.columns)}')
print(f'Envases: {df["Envase"].unique()}')
