import pandas as pd

# Leer el CSV con diferentes codificaciones
try:
    df = pd.read_csv('Ejemplo plantilla post cosecha.csv', sep=';', nrows=100, encoding='utf-8')
except UnicodeDecodeError:
    try:
        df = pd.read_csv('Ejemplo plantilla post cosecha.csv', sep=';', nrows=100, encoding='latin-1')
    except UnicodeDecodeError:
        df = pd.read_csv('Ejemplo plantilla post cosecha.csv', sep=';', nrows=100, encoding='cp1252')

# Guardar como Excel
df.to_excel('test_envases_real.xlsx', index=False)
print('Archivo Excel creado: test_envases_real.xlsx')
print(f'Filas: {len(df)}')
print(f'Columnas: {list(df.columns)}')
print(f'Envases únicos: {df["Envase"].unique()}')