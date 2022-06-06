import React, { ReactElement, useEffect, useRef, useState } from "react";
import { Breadcrumb, Form, Input, FormInstance, Button, Row, Col } from "antd";
import RunCard from "../../components/cards/RunCard";
import { RunInterface, SettingsInterface } from "../../interfaces";
import { notifySave } from "../../utils";
import { createUseStyles } from "react-jss";
import {
  SAVE_SETTINGS_CHANNEL,
  FETCH_SETTINGS_CHANNEL,
  PICK_SINGLE_FOLDER_CHANNEL,
} from "../../channels";
import { IpcMainEvent, IpcRendererEvent } from "electron/renderer";

const { ipcRenderer } = window.require("electron");

const useStyles = createUseStyles({
  breadcrumb: { marginBottom: 8 },
});

export default function Settings({
  running,
  setNavIsDisabled,
}: {
  running: RunInterface | null;
  setNavIsDisabled: (navIsDisabled: boolean) => void;
}): ReactElement {
  const classes = useStyles();
  const formRef = useRef<FormInstance | null>();
  const isMounted = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  const onFinish = () => {
    setIsLoading(true);
    setNavIsDisabled(true);
    ipcRenderer.removeAllListeners(SAVE_SETTINGS_CHANNEL.REPLY);
    ipcRenderer.on(
      SAVE_SETTINGS_CHANNEL.REPLY,
      (
        _: IpcRendererEvent,
        message: {
          type: string;
        }
      ) => {
        switch (message.type) {
          case "finished": {
            setIsLoading(false);
            notifySave();
            setNavIsDisabled(false);
            break;
          }
          default: {
            throw new Error(
              `No case selected in switch-statement, ${message.type} is not a valid case ...`
            );
          }
        }
      }
    );
    ipcRenderer.send(
      SAVE_SETTINGS_CHANNEL.IN,
      formRef.current.getFieldsValue()
    );
  };

  const fetchConfig = () => {
    ipcRenderer
      .invoke(FETCH_SETTINGS_CHANNEL.IN)
      .then((settings: SettingsInterface) => {
        formRef.current.setFieldsValue(settings);
      });
  };

  const onPickStorageClick = () => {
    ipcRenderer
      .invoke(PICK_SINGLE_FOLDER_CHANNEL.IN)
      .then((dataPath: string | null) => {
        if (dataPath == null) {
          return;
        }
        formRef.current.setFieldsValue({ dataPath });
      });
  };

  const onSaveClick = () => {
    formRef.current.submit();
  };

  useEffect(() => {
    isMounted.current = true;
    fetchConfig();
    return () => {
      ipcRenderer.removeAllListeners(SAVE_SETTINGS_CHANNEL.REPLY);
      isMounted.current = false;
    };
  });

  return (
    <>
      <Breadcrumb className={classes.breadcrumb}>
        <Breadcrumb.Item>Settings</Breadcrumb.Item>
      </Breadcrumb>
      <Row>
        <Col span={12}>
          <RunCard
            disableFullHeight
            buttons={[
              <Button type="primary" disabled={isLoading} onClick={onSaveClick}>
                Save
              </Button>,
            ]}
            title="Settings"
          >
            <Form
              layout="vertical"
              ref={(node) => {
                formRef.current = node;
              }}
              onFinish={onFinish}
            >
              <Form.Item label="Storage Path" name="dataPath">
                <Input.Search
                  disabled={isLoading || running !== null}
                  readOnly
                  onSearch={onPickStorageClick}
                  enterButton="Pick Path"
                  loading={isLoading}
                ></Input.Search>
              </Form.Item>
            </Form>
          </RunCard>
        </Col>
      </Row>
    </>
  );
}
