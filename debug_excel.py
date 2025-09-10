import pandas as pd

# Leer el archivo Excel para verificar su estructura
try:
    df = pd.read_excel('test_debug.xlsx')
    print("Archivo leído correctamente")
    print(f"Dimensiones: {df.shape}")
    print(f"Columnas: {list(df.columns)}")
    print("\nPrimeras 3 filas:")
    print(df.head(3))
    print(f"\nTipos de datos:")
    print(df.dtypes)
except Exception as e:
    print(f"Error leyendo archivo: {e}")
