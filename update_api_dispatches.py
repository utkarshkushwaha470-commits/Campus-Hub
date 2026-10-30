import os

path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\frontend\src\services\api.js"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

target = """  sendChiefMessage: (data) => request('/admin/chief-message', {
    method: 'POST',
    body: JSON.stringify(data)
  }),"""

replacement = """  sendChiefMessage: (data) => request('/admin/chief-message', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getFacultyDispatches: () => request('/admin/faculty-dispatches'),
  replyToFacultyDispatch: (dispatchId, data) => request(`/admin/reply-dispatch/${dispatchId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  markDispatchRead: (dispatchId) => request(`/admin/mark-dispatch-read/${dispatchId}`, {
    method: 'POST'
  }),
  getMySentDispatches: () => request('/admin/my-sent-dispatches'),"""

c = c.replace(target, replacement)
with open(path, "w", encoding="utf-8") as f:
    f.write(c)

print("api.js updated with dispatch functions!")
