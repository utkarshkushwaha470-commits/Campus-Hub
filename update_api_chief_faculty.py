import os

path = r"C:\Users\sssss\.gemini\antigravity\scratch\campusconnect\frontend\src\services\api.js"
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

target = """  listFaculty: () => request('/admin/faculty-list'),"""

replacement = """  listFaculty: () => request('/admin/faculty-list'),
  facultySendToChief: (data) => request('/admin/faculty/send-to-chief', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  facultyGetChiefConversation: () => request('/admin/faculty/my-chief-conversation'),
  getFacultyChatsForChief: () => request('/admin/faculty-chats'),
  getFacultyChatThread: (facultyId) => request(`/admin/faculty-chat-thread/${facultyId}`),
  replyToFaculty: (facultyId, data) => request(`/admin/reply-faculty/${facultyId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),"""

c = c.replace(target, replacement)
with open(path, "w", encoding="utf-8") as f:
    f.write(c)

print("api.js updated with Chief-Faculty Chat functions!")
