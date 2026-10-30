path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\frontend\src\services\api.js"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

target = """  createAdmin: (data) => request('/admin/create-admin', {
    method: 'POST',
    body: JSON.stringify(data)
  }),"""

replacement = """  createAdmin: (data) => request('/admin/create-admin', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  appointFaculty: (data) => request('/admin/appoint-faculty', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  listFaculty: () => request('/admin/faculty-list'),"""

c = c.replace(target, replacement)
with open(path, "w", encoding="utf-8") as f:
    f.write(c)
print("api.js updated successfully!")
