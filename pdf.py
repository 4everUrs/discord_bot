import re
import json
import pdfplumber
from datetime import datetime
import sys

EMAIL_DOMAIN = "@bcp.edu.ph"


def convert_date(date_str):
    """
    Convert 'Tuesday, 4 November 2025'
    to '2025-11-04'
    """
    date_str = date_str.split(", ", 1)[1]
    dt = datetime.strptime(date_str, "%d %B %Y")
    return dt.strftime("%Y-%m-%d")


def parse_pdf(pdf_path, class_name, section):
    students = []

    with pdfplumber.open(pdf_path) as pdf:

        text = "\n".join(page.extract_text() for page in pdf.pages)

        pattern = re.compile(
            r"(\d{7,9})\s+([A-Za-zñÑ.'\- ]+),\s*([A-Za-zñÑ.'\- ]+)\s+([A-Za-z]+,\s*\d+\s+[A-Za-z]+\s+\d{4})"
        )

        for match in pattern.findall(text):

            student_id = match[0]
            last_name = match[1].strip()
            first_name = match[2].strip()
            enrollment_date = convert_date(match[3])

            students.append({
                "student_id": student_id,
                "first_name": first_name.split()[0],
                "last_name": last_name,
                "email": f"{student_id}{EMAIL_DOMAIN}",
                "class_name": class_name,
                "section": section,
                "enrollment_date": enrollment_date
            })

    return students


def main():

    if len(sys.argv) < 5:
        print("Usage:")
        print("python pdf_to_students_json.py input.pdf \"Class Name\" \"Section\" output.json")
        return

    pdf_path = sys.argv[1]
    class_name = sys.argv[2]
    section = sys.argv[3]
    output_file = sys.argv[4]

    students = parse_pdf(pdf_path, class_name, section)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(students, f, separators=(",", ":"))

    print(f"Generated {len(students)} students → {output_file}")


if __name__ == "__main__":
    main()