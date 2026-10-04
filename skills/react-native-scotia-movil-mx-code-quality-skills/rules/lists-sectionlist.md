---
title: SectionList with Types and Headers
impact: HIGH
impactDescription: virtualization for grouped lists; ScrollView + map freezes the UI
tags: lists, SectionList, sections, headers, virtualization
---

## SectionList with Types and Headers

**Impact: HIGH**

`SectionList` is the virtualized version for lists with sections (agendas,
grouped catalogs). It renders only the visible items. The required format is
`{ title: string; data: T[] }[]`. `stickySectionHeadersEnabled` pins the
headers natively while scrolling.

**Incorrect (ScrollView + nested map):**

```tsx
// ❌ ScrollView renders all contacts in memory
const ContactList = ({ sections }: Props) => (
  <ScrollView>
    {sections.map((section) => (
      <View key={section.letter}>
        <View style={styles.header}>
          <Text>{section.letter}</Text>
        </View>
        {/* ❌ No key on the inner children */}
        {section.contacts.map((contact) => (
          <View style={styles.item}>
            <Text>{contact.name}</Text>
          </View>
        ))}
      </View>
    ))}
  </ScrollView>
);
```

**Correct (SectionList with typed data):**

```tsx
interface Contact {
  id: string;
  name: string;
  phone: string;
}
// ✅ SectionList expects { title: string; data: T[] }[]
interface Section {
  data: Contact[];
  title: string;
}

const ContactItem = memo(({ name, phone }: Omit<Contact, 'id'>) => (
  <View style={styles.item}>
    <Text style={styles.name}>{name}</Text>
    <Text style={styles.phone}>{phone}</Text>
  </View>
));

const SectionHeader = memo(({ title }: { title: string }) => (
  <View style={styles.header}>
    <Text style={styles.headerText}>{title}</Text>
  </View>
));

const ContactList = ({ sections }: { sections: Section[] }) => (
  <SectionList
    sections={sections}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <ContactItem name={item.name} phone={item.phone} />
    )}
    renderSectionHeader={({ section }) => (
      <SectionHeader title={section.title} />
    )}
    stickySectionHeadersEnabled // ✅ Native sticky headers
    removeClippedSubviews
  />
);
```

**In this repo:** `SectionList` is currently not used — grouped lists are
handled by flattening the sections into entries and using `FlatList` with
`ListHeaderComponent` (see `buildDataListEntries` +
[DataList.tsx](src/scotia-lego-ui/src/components/dataList/DataList.tsx)). If
`SectionList` is introduced, follow this typed pattern (`{ title; data: T[] }[]`),
memoize the item and header, and take colors from `canvasTheme`.

Reference: [SectionList — React Native Docs](https://reactnative.dev/docs/sectionlist)
