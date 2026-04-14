function mapStudent(studentDoc) {
  const raw = studentDoc.toObject ? studentDoc.toObject() : studentDoc;

  return {
    name: raw.name,
    studentId: raw.id,
    email: raw.email,
    phoneNo: raw.phone_no,
    attendance: raw.attandance || {},
  };
}

module.exports = {
  mapStudent,
};
