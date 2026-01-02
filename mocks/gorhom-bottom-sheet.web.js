// Mock for @gorhom/bottom-sheet on web
// Bottom sheet uses reanimated which doesn't work on web
// Provide a simple modal replacement
const React = require('react');
const { View, Modal, TouchableOpacity, StyleSheet } = require('react-native-web');

const BottomSheet = React.forwardRef(({ children, snapPoints, index }, ref) => {
  const [visible, setVisible] = React.useState(index >= 0);

  React.useImperativeHandle(ref, () => ({
    snapToIndex: (i) => setVisible(i >= 0),
    close: () => setVisible(false),
    expand: () => setVisible(true),
  }));

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => setVisible(false)}
      >
        <View style={styles.content} onClick={(e) => e.stopPropagation()}>
          {children}
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
});

module.exports = {
  default: BottomSheet,
  BottomSheetModal: BottomSheet,
  BottomSheetBackdrop: View,
};
