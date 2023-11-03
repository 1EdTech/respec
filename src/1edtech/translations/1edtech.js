export default {
  en: {
    privacy_section_header: "Privacy",
    privacy_implications: "Privacy Implications",
    privacy_implications_paragraph:
      "All of the privacy implications contained within this Information Model are described in this Section. All of the corresponding concepts and methods for these privacy annotations are defined in the Privacy Framework.",
    confidentiality_level: "Confidentiality Level",
    confidentiality_level_paragram:
      "All of the privacy classification of the exchanged payloads are described in this Section.",
    ACCESSIBILITY_label: "Accessibility",
    ACCESSIBILITY_def:
      "denotes information about the accessibility personal needs and preferences of the user",
    ANALYTICS_label: "Analytics",
    ANALYTICS_def:
      "denotes information that will be used to support the creation of learning analytics",
    CONTAINER_label: "Container",
    CONTAINER_def:
      "denotes that the child attributes have privacy-sensitive information",
    CREDENTIALS_label: "Credentials",
    CREDENTIALS_def:
      "denotes access control information for the use e.g. password, private key, etc.",
    CREDENTIALSIDREF_label: "CredentialsIdRef",
    CREDENTIALSIDREF_def:
      "denotes reference to/use of an identifier to credentials information for the user",
    DEMOGRAPHICS_label: "Demographics",
    DEMOGRAPHICS_def:
      "denotes information about the demographics of the user e.g. ethnicity, gender, etc.",
    EXTENSION_label: "Extension",
    EXTENSION_def:
      "denotes that proprietary information can be included and so this MAY contain privacy-sensitive information",
    FINANCIAL_label: "Financial",
    FINANCIAL_def:
      "denotes that the information is of a financial nature e.g. bank account, financial aid status, etc.",
    IDENTIFIER_label: "Identifier",
    IDENTIFIER_def:
      "denotes a unique identifier that has been assigned, by some third party, to the user e.g. passport number, social security number, etc.",
    IDENTIFIERREF_label: "IdentifierRef",
    IDENTIFIERREF_def:
      "denotes reference to/use of a unique identifier that has been assigned, by some third party, to the user",
    INSURANCE_label: "Insurance/Assurance",
    INSURANCE_def:
      "denotes that the information is about the insurance life-assurance nature, e.g. type of insurance, etc.",
    LEGAL_label: "Legal",
    LEGAL_def:
      "denotes that the information is of a legal or judicial nature e.g. Will, prison record, etc.",
    MEDICAL_label: "Medical/Healthcare",
    MEDICAL_def:
      "denotes that the information is of a medical, or healthcare-related nature e.g. allergies, blood-type, mobility needs, etc.",
    NA_label: "N/A",
    NA_def:
      "denotes that there are NO PRIVACY IMPLICATIONS for this attribute (this is the default setting)",
    OTHER_label: "Other",
    OTHER_def:
      "denotes privacy sensitive information that is NOT covered by one of the other categories",
    QUALIFICATION_label: "Qualification/Certification",
    QUALIFICATION_def:
      "denotes that the information is about education qualifications, skill-set certifications, microcredentials, etc.",
    PERSONAL_label: "Personal",
    PERSONAL_def:
      "denotes personal information about the user e.g. name, address, etc.",
    SOURCEDID_label: "SourcedId",
    SOURCEDID_def:
      "denotes the interoperability unique identifier that has been assigned and MUST be present for the correct usage of the corresponding 1EdTech specification",
    SOURCEDIDREF_label: "SourcedIdRef",
    SOURCEDIDREF_def:
      "denotes reference to/use of the interoperability unique identifier, sourcedId, to link/point to an associated 1EdTech object",
    UNRESTRICTED_label: "unrestricted",
    UNRESTRICTED_def:
      "there are no privacy concerns (this is the default value).",
    NORMAL_label: "normal",
    NORMAL_def:
      "denotes that privacy sensitive data could be included and so all best practices to secure this data should be used.",
    RESTRICTED_label: "restricted",
    RESTRICTED_def:
      "denotes that some of the data is more sensitive than usual or that many attributes information that when used together create increased vulnerability for identification of the associated individual or group.",
    VERYRESTRICTED_label: "veryrestricted",
    VERYRESTRICTED_def:
      "denotes that the request could contain very sensitive privacy data. Depending on the capabilities of the Provider this very sensitive data may be obfuscated or may not even be present.",
  },
};
